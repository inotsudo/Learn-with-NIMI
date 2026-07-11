import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ParentControls from "@/components/parents/ParentControls";

// localStorage mock
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, val: string) => { store[key] = val; }),
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, "localStorage", { value: localStorageMock });

describe("ParentControls", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it("renders Controls heading", () => {
    render(<ParentControls childName="Emma" childLanguage="en" />);
    expect(screen.getByText("Controls")).toBeInTheDocument();
  });

  it("shows default daily goal of 2", () => {
    render(<ParentControls childName="Emma" childLanguage="en" />);
    expect(screen.getByText("2 missions per day")).toBeInTheDocument();
  });

  it("increments daily goal on + click", () => {
    render(<ParentControls childName="Emma" childLanguage="en" />);
    // First + button is daily goal; second is screen time
    fireEvent.click(screen.getAllByText("+")[0]);
    expect(screen.getByText("3 missions per day")).toBeInTheDocument();
  });

  it("decrements daily goal on − click", () => {
    render(<ParentControls childName="Emma" childLanguage="en" />);
    // First − button is daily goal; second is screen time
    fireEvent.click(screen.getAllByText("−")[0]);
    // Minimum is 1
    expect(screen.getByText("1 missions per day")).toBeInTheDocument();
  });

  it("does not go below 1 mission per day", () => {
    render(<ParentControls childName="Emma" childLanguage="en" />);
    const dec = screen.getAllByText("−")[0];
    fireEvent.click(dec);
    fireEvent.click(dec); // would go to 0, but is clamped
    expect(screen.getByText("1 missions per day")).toBeInTheDocument();
  });

  it("saves prefs to localStorage on change", () => {
    render(<ParentControls childName="Emma" childLanguage="en" />);
    fireEvent.click(screen.getAllByText("+")[0]);
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it("shows English for language 'en'", () => {
    render(<ParentControls childName="Emma" childLanguage="en" />);
    expect(screen.getByText("English")).toBeInTheDocument();
  });

  it("shows Français for language 'fr'", () => {
    render(<ParentControls childName="Amina" childLanguage="fr" />);
    expect(screen.getByText("Français")).toBeInTheDocument();
  });

  it("shows Kinyarwanda for language 'rw'", () => {
    render(<ParentControls childName="Keza" childLanguage="rw" />);
    expect(screen.getByText("Kinyarwanda")).toBeInTheDocument();
  });

  it("shows child name in language row description", () => {
    render(<ParentControls childName="Nia" childLanguage="en" />);
    expect(screen.getByText(/Nia/)).toBeInTheDocument();
  });
});
