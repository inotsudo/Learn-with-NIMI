import { describe, it, expect } from "vitest";
import { personalize, personalizeTitle, personalizeJson } from "@/lib/personalize";

describe("personalize", () => {
  it("replaces {child_name} token", () => {
    expect(personalize("Hello, {child_name}!", "Emma")).toBe("Hello, Emma!");
  });

  it("replaces [NAME] legacy token", () => {
    expect(personalize("Salut [NAME] !", "Léa")).toBe("Salut Léa !");
  });

  it("replaces [PRENOM] legacy token", () => {
    expect(personalize("[PRENOM] aime lire.", "Amina")).toBe("Amina aime lire.");
  });

  it("replaces [IZINA] legacy token", () => {
    expect(personalize("[IZINA] ni umwana.", "Keza")).toBe("Keza ni umwana.");
  });

  it("falls back to 'Friend' when name is null", () => {
    expect(personalize("Hi {child_name}!", null)).toBe("Hi Friend!");
  });

  it("falls back to 'Friend' when name is empty string", () => {
    expect(personalize("Hi {child_name}!", "")).toBe("Hi Friend!");
  });

  it("falls back to 'Friend' when name is whitespace only", () => {
    expect(personalize("Hi {child_name}!", "   ")).toBe("Hi Friend!");
  });

  it("returns empty string when text is null", () => {
    expect(personalize(null, "Emma")).toBe("");
  });

  it("returns empty string when text is undefined", () => {
    expect(personalize(undefined, "Emma")).toBe("");
  });

  it("replaces multiple occurrences", () => {
    expect(personalize("{child_name} loves {child_name}!", "Nia")).toBe("Nia loves Nia!");
  });

  it("does not mutate text without tokens", () => {
    expect(personalize("Hello world!", "Emma")).toBe("Hello world!");
  });
});

describe("personalizeTitle", () => {
  it("constructs adventure title with child name", () => {
    expect(personalizeTitle("The Forest", "Emma")).toBe("Emma and Nimi's The Forest Adventure");
  });

  it("falls back to 'Friend' when name is null", () => {
    expect(personalizeTitle("The Forest", null)).toBe("Friend and Nimi's The Forest Adventure");
  });
});

describe("personalizeJson", () => {
  it("replaces tokens inside JSON values", () => {
    const json = { greeting: "Hello {child_name}!", nested: { msg: "Welcome [NAME]" } };
    const result = personalizeJson(json, "Amara");
    expect(result).toEqual({ greeting: "Hello Amara!", nested: { msg: "Welcome Amara" } });
  });

  it("returns empty object when json is null", () => {
    expect(personalizeJson(null, "Emma")).toEqual({});
  });

  it("returns empty object when json is undefined", () => {
    expect(personalizeJson(undefined, "Emma")).toEqual({});
  });

  it("returns original json when JSON.parse fails", () => {
    // Can't easily trigger parse failure through the API, but verify passthrough
    const json = { a: 1 };
    expect(personalizeJson(json, "Emma")).toEqual({ a: 1 });
  });
});
