import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

type SkillInfo = {
  id: string;
  name: string;
  description?: string;
};

export type SkillsResponseBody = {
  skills: SkillInfo[];
  sailCliEnabled: boolean;
};

async function readSkillFile(dirEntryName: string, skillsRoot: string): Promise<SkillInfo | null> {
  const dir = path.join(skillsRoot, dirEntryName);
  const skillFile = path.join(dir, "SKILL.md");

  try {
    const raw = await fs.readFile(skillFile, "utf8");

    // Default values if front matter is missing.
    let name = dirEntryName;
    let description: string | undefined;

    // Very light front-matter parsing; we only care about top-level `name` and `description`.
    const nameMatch = raw.match(/^\s*name:\s*(.+)\s*$/m);
    if (nameMatch) {
      name = nameMatch[1].trim();
    }

    const descMatch = raw.match(/^\s*description:\s*(.+)\s*$/m);
    if (descMatch) {
      description = descMatch[1].trim();
    }

    return { id: dirEntryName, name, description };
  } catch {
    // Ignore entries without a readable SKILL.md
    return null;
  }
}

export async function GET() {
  const skillsRoot = path.join(process.cwd(), "skills");
  const sailCliEnabled =
    String(process.env.ENABLE_SAIL_CLI ?? "").toLowerCase() === "true";

  try {
    const dirEntries = await fs.readdir(skillsRoot, { withFileTypes: true });
    const skills: SkillInfo[] = [];

    for (const entry of dirEntries) {
      if (!entry.isDirectory()) continue;
      const info = await readSkillFile(entry.name, skillsRoot);
      if (info) skills.push(info);
    }

    const visibleSkills = sailCliEnabled
      ? skills
      : skills.filter((skill) => skill.id !== "sail-cli-transform");

    // Sort for a stable, readable order by name.
    visibleSkills.sort((a, b) => a.name.localeCompare(b.name));

    const body: SkillsResponseBody = {
      skills: visibleSkills,
      sailCliEnabled,
    };

    return NextResponse.json(body);
  } catch (error) {
    console.error("[GET /api/skills]", error);
    return NextResponse.json(
      { error: "Failed to enumerate skills" },
      { status: 500 },
    );
  }
}

