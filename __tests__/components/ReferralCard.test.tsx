import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ReferralCard from "@/components/parents/ReferralCard";

describe("ReferralCard", () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it("displays the referral code", () => {
    render(<ReferralCard code="ABC123" referralCount={3} rewardsEarned={1} />);
    expect(screen.getByText("ABC123")).toBeInTheDocument();
  });

  it("shows placeholder when code is null", () => {
    render(<ReferralCard code={null} referralCount={0} rewardsEarned={0} />);
    expect(screen.getByText("———")).toBeInTheDocument();
  });

  it("shows singular 'Friend joined' for count of 1", () => {
    render(<ReferralCard code="XYZ" referralCount={1} rewardsEarned={0} />);
    expect(screen.getByText("Friend joined")).toBeInTheDocument();
  });

  it("shows plural 'Friends joined' for count of 5", () => {
    render(<ReferralCard code="XYZ" referralCount={5} rewardsEarned={0} />);
    expect(screen.getByText("Friends joined")).toBeInTheDocument();
  });

  it("shows 'month' singular for 1 reward", () => {
    render(<ReferralCard code="XYZ" referralCount={0} rewardsEarned={1} />);
    expect(screen.getByText("Free month earned")).toBeInTheDocument();
  });

  it("shows 'months' plural for 3 rewards", () => {
    render(<ReferralCard code="XYZ" referralCount={0} rewardsEarned={3} />);
    expect(screen.getByText("Free months earned")).toBeInTheDocument();
  });

  it("copies share URL to clipboard on Copy click", async () => {
    render(<ReferralCard code="REF42" referralCount={0} rewardsEarned={0} />);
    fireEvent.click(screen.getByText("Copy"));
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        "https://nimipiko.com/signup?ref=REF42"
      );
    });
  });

  it("shows 'Copied!' feedback after copy", async () => {
    render(<ReferralCard code="REF42" referralCount={0} rewardsEarned={0} />);
    fireEvent.click(screen.getByText("Copy"));
    await waitFor(() => {
      expect(screen.getByText("Copied!")).toBeInTheDocument();
    });
  });

  it("renders a Share button", () => {
    render(<ReferralCard code="XYZ" referralCount={0} rewardsEarned={0} />);
    expect(screen.getByText("Share")).toBeInTheDocument();
  });
});
