"use client";
import { useState } from "react";
import { useMetaMask } from "@/hooks/useMetaMask";
import { apiFetch } from "@/lib/api";

export default function ClaimForm({
  onSubmitted,
}: {
  onSubmitted?: () => void;
}) {
  const { address } = useMetaMask();
  const [claimType, setClaimType] = useState("Motor");
  const [description, setDescription] = useState("");
  const [incidentDate, setIncidentDate] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address) {
      setStatus("Please connect your wallet first.");
      return;
    }
    setLoading(true);
    setStatus("Submitting claim...");

    try {
      await apiFetch(
        "/api/claims",
        {
          method: "POST",
          body: JSON.stringify({
            claimType,
            description,
            incidentDate,
          }),
        },
        address
      );

      setStatus("Claim submitted successfully!");
      setDescription("");
      setIncidentDate("");
      onSubmitted?.();
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      <h2 className="text-xl font-medium">Submit New Claim</h2>

      <div>
        <label className="block text-sm mb-1 font-medium">Claim Type</label>
        <select
          value={claimType}
          onChange={(e) => setClaimType(e.target.value)}
          className="w-full border rounded px-3 py-2"
        >
          <option>Motor</option>
          <option>Medical</option>
          <option>Property</option>
          <option>Life</option>
        </select>
      </div>

      <div>
        <label className="block text-sm mb-1 font-medium">Incident Date</label>
        <input
          type="date"
          value={incidentDate}
          onChange={(e) => setIncidentDate(e.target.value)}
          className="w-full border rounded px-3 py-2"
          required
        />
      </div>

      <div>
        <label className="block text-sm mb-1 font-medium">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full border rounded px-3 py-2 h-28"
          placeholder="Describe the incident..."
          required
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white rounded py-2 font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Submitting..." : "Submit Claim"}
      </button>

      {status && (
        <p className={`text-sm mt-2 ${status.startsWith("Error") ? "text-red-600" : "text-green-600"}`}>
          {status}
        </p>
      )}
    </form>
  );
}
