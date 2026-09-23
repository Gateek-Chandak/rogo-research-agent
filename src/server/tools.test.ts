import { describe, expect, it } from "vitest";
import { resolveCompany } from "./tools.ts";

const resolves = (input: string, expected: string) =>
  it(`resolves "${input}"`, () =>
    expect(resolveCompany(input).name).toBe(expected));

describe("resolveCompany", () => {
  resolves("Initech", "Initech");
  resolves("initech", "Initech");
  resolves("Initech Inc", "Initech");

  resolves("ITCH", "Initech");
  resolves("itch", "Initech");
  resolves("GLBX", "Globex Inc");

  resolves("Umbrella", "Umbrella Health");
  resolves("globex", "Globex Inc");

  resolves("Intech", "Initech");
  resolves("Globx", "Globex Inc");
  resolves("Umbrela Health", "Umbrella Health");

  // ACME is Acme Corp's ticker, so an exact uppercase match beats the prefix.
  resolves("ACME", "Acme Corp");

  it("asks rather than guessing between the two Acmes", () => {
    expect(() => resolveCompany("Acme")).toThrow(/Acme Corp.*Acme Robotics/s);
  });

  it("names the universe when nothing matches", () => {
    expect(() => resolveCompany("Tesla")).toThrow(/not in our coverage universe/);
  });

  it("rejects an empty company", () => {
    expect(() => resolveCompany("  ")).toThrow(/required/);
  });
});
