/**
 * useStarfieldAPI - Global starfield API for external interactions
 *
 * This hook sets up a global window.starfieldAPI object that allows
 * external code to interact with the starfield (e.g., for testing,
 * debugging, or integration with other components).
 *
 * API methods:
 * - applyForce(x, y, radius, force): Apply force to stars in an area
 * - getStarsCount(): Get the current number of stars
 * - createExplosion(x, y): Create a visual explosion effect
 */

import { useEffect, MutableRefObject } from "react";
import { Star } from "../types";
import { applyClickForce, createClickExplosion } from "../stars";

// The Window.starfieldAPI global is declared canonically in ../types.ts.

export interface StarfieldAPIConfig {
  /** Ref to stars array */
  starsRef: MutableRefObject<Star[]>;
  /** Ref to canvas element */
  canvasRef: MutableRefObject<HTMLCanvasElement | null>;
}

/**
 * Hook for setting up global starfield API
 * Automatically cleans up on unmount
 */
export function useStarfieldAPI({
  starsRef,
  canvasRef,
}: StarfieldAPIConfig): void {
  useEffect(() => {
    // Create a global API for testing and external interactions
    window.starfieldAPI = {
      /**
       * Apply force to stars within a radius
       * @returns Number of affected stars
       */
      applyForce: (
        x: number,
        y: number,
        radius: number,
        force: number,
      ): number => {
        if (starsRef.current && starsRef.current.length > 0) {
          return applyClickForce(starsRef.current, x, y, radius, force);
        }
        return 0;
      },

      /**
       * Get current star count
       */
      getStarsCount: (): number => starsRef.current?.length || 0,

      /**
       * Create explosion visual effect at position
       * @returns Whether explosion was created successfully
       */
      createExplosion: (x: number, y: number): boolean => {
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext("2d");
          if (ctx) {
            createClickExplosion(
              ctx,
              x,
              y,
              300,
              "rgba(255, 255, 255, 0.9)",
              1000,
            );
            return true;
          }
        }
        return false;
      },
    };

    return (): void => {
      delete window.starfieldAPI;
    };
  }, [starsRef, canvasRef]);
}
