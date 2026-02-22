"use client";

import { useState } from "react";

type Contributor = {
  givenName: string;
  familyName: string;
  email: string;
  affiliation: string;
  orcid: string;
  role: "AUTHOR" | "TRANSLATOR" | "EDITOR";
  isPrimary: boolean;
};

export function ContributorFields() {
  const [contributors, setContributors] = useState<Contributor[]>([]);

  const addContributor = () => {
    setContributors([
      ...contributors,
      {
        givenName: "",
        familyName: "",
        email: "",
        affiliation: "",
        orcid: "",
        role: "AUTHOR",
        isPrimary: false,
      },
    ]);
  };

  const removeContributor = (index: number) => {
    setContributors(contributors.filter((_, i) => i !== index));
  };

  const updateContributor = (index: number, field: keyof Contributor, value: string | boolean) => {
    const updated = [...contributors];
    updated[index] = { ...updated[index], [field]: value };
    setContributors(updated);
  };

  return (
    <div className="sm:col-span-2">
      <p className="text-sm font-medium text-yellow-100">Contributors (co-authors, translators)</p>
      <p className="mt-1 text-xs text-yellow-200/80">
        Add additional authors or contributors (optional). You are already listed as the submitting author.
      </p>
      <input type="hidden" name="contributorsData" value={JSON.stringify(contributors.map((c, idx) => ({ ...c, sequence: idx })))} />

      <div className="mt-3 space-y-3">
        {contributors.map((contributor, index) => (
          <div key={index} className="grid gap-2 rounded-lg border border-yellow-500/30 p-3 sm:grid-cols-2">
            <input
              type="text"
              placeholder="Given name"
              value={contributor.givenName}
              onChange={(e) => updateContributor(index, "givenName", e.target.value)}
              className="rounded-lg border border-yellow-500/40 bg-red-950 px-3 py-2 text-sm text-yellow-100 outline-none ring-yellow-400 focus:ring-2"
            />
            <input
              type="text"
              placeholder="Family name"
              value={contributor.familyName}
              onChange={(e) => updateContributor(index, "familyName", e.target.value)}
              className="rounded-lg border border-yellow-500/40 bg-red-950 px-3 py-2 text-sm text-yellow-100 outline-none ring-yellow-400 focus:ring-2"
            />
            <input
              type="email"
              placeholder="Email (optional)"
              value={contributor.email}
              onChange={(e) => updateContributor(index, "email", e.target.value)}
              className="rounded-lg border border-yellow-500/40 bg-red-950 px-3 py-2 text-sm text-yellow-100 outline-none ring-yellow-400 focus:ring-2"
            />
            <input
              type="text"
              placeholder="Affiliation (optional)"
              value={contributor.affiliation}
              onChange={(e) => updateContributor(index, "affiliation", e.target.value)}
              className="rounded-lg border border-yellow-500/40 bg-red-950 px-3 py-2 text-sm text-yellow-100 outline-none ring-yellow-400 focus:ring-2"
            />
            <input
              type="text"
              placeholder="ORCID (optional)"
              value={contributor.orcid}
              onChange={(e) => updateContributor(index, "orcid", e.target.value)}
              className="rounded-lg border border-yellow-500/40 bg-red-950 px-3 py-2 text-sm text-yellow-100 outline-none ring-yellow-400 focus:ring-2"
            />
            <select
              value={contributor.role}
              onChange={(e) => updateContributor(index, "role", e.target.value)}
              className="rounded-lg border border-yellow-500/40 bg-red-950 px-3 py-2 text-sm text-yellow-100 outline-none ring-yellow-400 focus:ring-2"
            >
              <option value="AUTHOR">Author</option>
              <option value="TRANSLATOR">Translator</option>
              <option value="EDITOR">Editor</option>
            </select>
            <button
              type="button"
              onClick={() => removeContributor(index)}
              className="sm:col-span-2 rounded-lg border border-yellow-400/70 px-3 py-2 text-xs font-medium text-yellow-100 transition hover:bg-red-800"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addContributor}
        className="mt-3 rounded-lg border border-yellow-400/70 px-3 py-2 text-xs font-medium text-yellow-100 transition hover:bg-red-800"
      >
        + Add contributor
      </button>
    </div>
  );
}
