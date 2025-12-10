"use client";

import StudentLayout from "../student/layout";

export default function CategoriesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StudentLayout>{children}</StudentLayout>;
}

