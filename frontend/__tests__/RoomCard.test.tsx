import { render, screen, fireEvent } from "@testing-library/react";
import { RoomCard } from "@/components/domain/RoomCard";

describe("components/domain/RoomCard", () => {
  const baseSnapshot = {
    tier: "ALERT",
    co2: 1200,
    temp_c: 24.56,
    rh: 55.4,
    pm25: 38,
  };

  it("병실 코드·재실 인원·센서 값을 렌더링한다", () => {
    render(
      <RoomCard
        roomCode="W-301"
        capacity={6}
        occ={4}
        snapshot={baseSnapshot}
      />,
    );
    expect(screen.getByText("W-301")).toBeInTheDocument();
    expect(screen.getByText(/재실 4\/6명/)).toBeInTheDocument();
    expect(screen.getByText("1200")).toBeInTheDocument(); // CO₂
    expect(screen.getByText("38")).toBeInTheDocument(); // PM2.5
    expect(screen.getByText("24.6")).toBeInTheDocument(); // temp toFixed(1)
    expect(screen.getByText("55%")).toBeInTheDocument(); // rh toFixed(0)
  });

  it("snapshot.tier에 해당하는 한글 배지를 표시한다", () => {
    render(<RoomCard roomCode="W-301" capacity={6} occ={4} snapshot={baseSnapshot} />);
    expect(screen.getByText("경계")).toBeInTheDocument(); // ALERT
  });

  it("tier가 없거나 미지이면 MONITOR(정상)로 폴백하고 결측치는 대시로 표기한다", () => {
    render(<RoomCard roomCode="W-999" capacity={2} snapshot={{}} />);
    expect(screen.getByText("정상")).toBeInTheDocument();
    // occ 미제공 → "재실 —/2명"
    expect(screen.getByText(/재실 —\/2명/)).toBeInTheDocument();
    // co2/pm25 결측 → 대시(여러 개)
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("카드 클릭 시 onClick 핸들러가 호출된다", () => {
    const onClick = jest.fn();
    render(
      <RoomCard roomCode="W-301" capacity={6} occ={4} snapshot={baseSnapshot} onClick={onClick} />,
    );
    fireEvent.click(screen.getByText("W-301"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
