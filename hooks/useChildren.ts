"use client";

import { useEffect, useState, useCallback } from "react";
import supabase from "@/lib/supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";

export interface Child {
  id: string;
  name: string;
  birthDate: string;
  age?: string; // or number, depending on your logic
  screenTimeLimit?: number;
  bedtimeMode?: boolean;
  activities?: any[];
  bedtimeStart?: string; // add this
  bedtimeEnd?: string;   
  contentLock?: boolean;
  avatar?: string;
  theme?: string;
  whitelist?: string[];
  blacklist?: string[];
}

// In @/hooks/useChildren.ts
export type Activity = {
  id: string;
  title: string;
  completed: boolean;
  weeklyRecord?: boolean[]; 
};


interface UseChildrenResult {
  children: Child[];
  isReady: boolean;
  addChild: (name: string) => Promise<{ success: boolean; child?: Child; error?: string }>;
  updateChild: (id: string, updates: Partial<Child>) => void;
  removeChild: (id: string) => void;
}

export function useChildren(parentId: string | null): UseChildrenResult {
  const user = useUser();
  const [children, setChildren] = useState<Child[]>([]);
  const [isReady, setIsReady] = useState(false);

  const fetchChildren = useCallback(async () => {
    if (!parentId) return;
    try {
      const { data, error } = await supabase
        .from("children")
        .select("*")
        .eq("parent_id", parentId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setChildren(data as Child[]);
    } catch (err: any) {
      console.error("Failed to fetch children:", err);
    } finally {
      setIsReady(true);
    }
  }, [parentId]);

  useEffect(() => {
    fetchChildren();
  }, [fetchChildren]);

  // --- Add a new child ---
  const addChild = async (name: string) => {
    if (!parentId) return { success: false, error: "Parent not found" };

    try {
      const { data, error } = await supabase
        .from("children")
        .insert([{ name, parent_id: parentId }])
        .select()
        .single();

      if (error) throw error;

      setChildren((prev) => [...prev, data as Child]);
      return { success: true, child: data as Child };
    } catch (err: any) {
      // Make sure we extract a readable error message
      const message =
        err?.message || err?.error_description || JSON.stringify(err) || "Failed to add child";

      console.error("Add child error:", message);
      return { success: false, error: message };
    }
  };

  // --- Update a child locally and in Supabase ---
  const updateChild = async (id: string, updates: Partial<Child>) => {
    try {
      const { data, error } = await supabase
        .from("children")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      setChildren((prev) =>
        prev.map((child) => (child.id === id ? { ...child, ...data } : child))
      );
    } catch (err: any) {
      const message = err?.message || JSON.stringify(err) || "Failed to update child";
      console.error("Update child error:", message);
    }
  };

  // --- Remove a child ---
  const removeChild = async (id: string) => {
    try {
      const { error } = await supabase.from("children").delete().eq("id", id);
      if (error) throw error;
      setChildren((prev) => prev.filter((child) => child.id !== id));
    } catch (err: any) {
      const message = err?.message || JSON.stringify(err) || "Failed to remove child";
      console.error("Remove child error:", message);
    }
  };

  return { children, isReady, addChild, updateChild, removeChild };
}
