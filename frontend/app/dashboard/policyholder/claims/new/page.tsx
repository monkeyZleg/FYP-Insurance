"use client";
import { Suspense } from "react";
import ClaimForm from "@/components/claims/ClaimForm";
import PageHeader from "@/components/ui/PageHeader";

export default function NewClaimPage() {
  return (
    <div>
      <PageHeader
        title="New claim"
        description="Four short steps. Your documents are fingerprinted in your browser before anything is uploaded."
        breadcrumb={[{ label: "My claims", href: "/dashboard/policyholder/claims" }, { label: "New claim" }]}
      />
      <Suspense fallback={null}>
        <ClaimForm />
      </Suspense>
    </div>
  );
}
