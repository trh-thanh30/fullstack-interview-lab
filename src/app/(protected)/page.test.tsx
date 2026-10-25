import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import DashboardPage from "@/app/(protected)/page";

describe("DashboardPage", () => {
  it("renders the primary practice action and learning tracks", () => {
    render(<DashboardPage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /luyện đúng chỗ yếu/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /bắt đầu luyện/i })).toHaveAttribute(
      "href",
      "/practice",
    );
    expect(screen.getByText("Frontend")).toBeInTheDocument();
    expect(screen.getByText("Architecture")).toBeInTheDocument();
  });
});
