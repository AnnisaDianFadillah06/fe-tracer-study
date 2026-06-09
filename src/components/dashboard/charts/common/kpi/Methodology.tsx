import React from "react";

export const Formula = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-md border border-border bg-muted/40 px-2.5 py-2 font-mono text-[11.5px] leading-snug text-foreground">
    {children}
  </div>
);

export const MethodologyBlock = ({
  description,
  formula,
  notes,
}: {
  description?: React.ReactNode;
  formula: React.ReactNode;
  notes?: React.ReactNode;
}) => (
  <>
    {description && <p className="text-muted-foreground">{description}</p>}
    <Formula>{formula}</Formula>
    {notes && <p className="text-[11px] text-muted-foreground">{notes}</p>}
  </>
);