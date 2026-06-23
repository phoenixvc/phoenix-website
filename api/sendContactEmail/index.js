const { EmailClient } = require("@azure/communication-email");

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

module.exports = async function (context, req) {
  const fail = (status, message) => {
    context.res = { status, headers: { "Content-Type": "application/json" }, body: { message } };
  };

  try {
    const body = (req && req.body) || {};
    const name = (body.name || "").toString().trim();
    const email = (body.email || "").toString().trim();
    const message = (body.message || "").toString().trim();
    const subject = (body.subject || "").toString().trim();
    const company = (body.company || "").toString().trim();
    const intent = (body.intent || "").toString().trim();

    if (!name || !email || !message) {
      return fail(400, "Name, email and message are required.");
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return fail(400, "Please provide a valid email address.");
    }

    const connectionString = process.env.ACS_CONNECTION_STRING;
    const senderAddress = process.env.ACS_SENDER;
    const recipients = (process.env.CONTACT_RECIPIENTS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (!connectionString || !senderAddress || recipients.length === 0) {
      context.log.error("[sendContactEmail] Missing email configuration.");
      return fail(500, "The contact service is not configured. Please email us directly.");
    }

    const heading = subject || intent || "New contact form submission";
    const html =
      "<h2>New PhoenixVC contact submission</h2>" +
      "<p><strong>Name:</strong> " + escapeHtml(name) + "</p>" +
      "<p><strong>Email:</strong> " + escapeHtml(email) + "</p>" +
      "<p><strong>Company:</strong> " + (escapeHtml(company) || "&mdash;") + "</p>" +
      "<p><strong>Intent:</strong> " + (escapeHtml(intent) || "&mdash;") + "</p>" +
      "<p><strong>Subject:</strong> " + (escapeHtml(subject) || "&mdash;") + "</p>" +
      "<hr/>" +
      '<p style="white-space:pre-wrap">' + escapeHtml(message) + "</p>";
    const plainText =
      "New PhoenixVC contact submission\n\n" +
      "Name: " + name + "\nEmail: " + email + "\nCompany: " + (company || "-") + "\n" +
      "Intent: " + (intent || "-") + "\nSubject: " + (subject || "-") + "\n\n" + message + "\n";

    const client = new EmailClient(connectionString);
    const poller = await client.beginSend({
      senderAddress,
      content: { subject: "[PhoenixVC Contact] " + heading + " - " + name, plainText, html },
      recipients: { to: recipients.map((address) => ({ address })) },
      replyTo: [{ address: email, displayName: name }],
    });
    await poller.pollUntilDone();

    context.res = { status: 200, headers: { "Content-Type": "application/json" }, body: { ok: true } };
  } catch (err) {
    context.log.error("[sendContactEmail] Failed:", err && err.message ? err.message : err);
    return fail(500, "Failed to send your message. Please try again later.");
  }
};
