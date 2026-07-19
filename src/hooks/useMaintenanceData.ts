import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { Asset, SparePart } from "@/types/operational";

// ==========================================
// ASSET HEALTH THRESHOLDS CONFIGURATION
// ==========================================
export const HEALTH_THRESHOLDS = {
  CRITICAL: {
    HEALTH_PCT: 30,
    RUL_DAYS: 7,
  },
  WARNING: {
    HEALTH_PCT: 60,
    RUL_DAYS: 30,
  },
};

/**
 * Computes the derived health status based on health percentage and RUL days.
 * Returns the more severe status implied by the inputs.
 */
export function computeHealthStatus(
  healthPct: number,
  rulDays: number,
): "healthy" | "warning" | "critical" {
  // Determine status by health percentage
  let pctStatus: "healthy" | "warning" | "critical" = "healthy";
  if (healthPct <= HEALTH_THRESHOLDS.CRITICAL.HEALTH_PCT) {
    pctStatus = "critical";
  } else if (healthPct <= HEALTH_THRESHOLDS.WARNING.HEALTH_PCT) {
    pctStatus = "warning";
  }

  // Determine status by RUL days
  let rulStatus: "healthy" | "warning" | "critical" = "healthy";
  if (rulDays <= HEALTH_THRESHOLDS.CRITICAL.RUL_DAYS) {
    rulStatus = "critical";
  } else if (rulDays <= HEALTH_THRESHOLDS.WARNING.RUL_DAYS) {
    rulStatus = "warning";
  }

  // Return the more severe status: critical > warning > healthy
  if (pctStatus === "critical" || rulStatus === "critical") {
    return "critical";
  }
  if (pctStatus === "warning" || rulStatus === "warning") {
    return "warning";
  }
  return "healthy";
}

export function useAssets() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAssets() {
      try {
        const { data, error } = await supabase
          .from("assets")
          .select("*")
          .order("name", { ascending: true });
        if (error) throw error;

        // Map assets columns to Asset structure
        const mappedAssets: Asset[] = (data || []).map((item) => ({
          id: item.id,
          asset_code: item.asset_code,
          name: item.name,
          type: item.category,
          plant: item.location,
          health_percentage: item.health_percentage ?? 100,
          status: (item.health_status || "healthy") as
            "healthy" | "warning" | "critical",
          rul_days: item.rul_days ?? 365,
          updated_at: item.updated_at,
        }));
        setAssets(mappedAssets);
      } catch (err) {
        console.error("Error fetching assets:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchAssets();

    // Subscribe to realtime changes on assets table
    const channel = supabase
      .channel("assets-realtime-maintenance")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "assets" },
        () => {
          fetchAssets();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { assets, loading };
}

export function usePartsStock() {
  const [parts, setParts] = useState<SparePart[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchParts() {
      try {
        const { data, error } = await supabase
          .from("spare_parts")
          .select("*")
          .order("name", { ascending: true });
        if (error) throw error;

        // Map spare_parts columns to SparePart structure
        const mappedParts: SparePart[] = (data || []).map((item) => ({
          id: item.id,
          part_code: item.part_code,
          name: item.name,
          current_quantity: item.current_qty,
          min_quantity: item.min_qty,
          updated_at: item.updated_at,
        }));
        setParts(mappedParts);
      } catch (err) {
        console.error("Error fetching spare parts:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchParts();

    // Subscribe to realtime changes on spare_parts table
    const channel = supabase
      .channel("spare_parts-realtime-maintenance")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "spare_parts" },
        () => {
          fetchParts();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { parts, loading };
}
