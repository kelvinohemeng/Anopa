import { useLocation } from "wouter";

interface BackButtonProps {
  overrideTo?: string;
  customLabel?: string;
}

export function BackButton({ overrideTo, customLabel }: BackButtonProps) {
  const [location, navigate] = useLocation();

  function formatSegment(segment: string) {
    return segment
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  const segment = location.split("/")[1];
  const label = segment ? formatSegment(customLabel ?? segment) : "Back";

  const handleClick = () => {
    if (overrideTo) {
      navigate(overrideTo);
    } else {
      window.history.back();
    }
  };

  return (
    <button
      onClick={handleClick}
      className=" !px-0 text-sm !bg-transparent capitalize"
    >
      ← {label}
    </button>
  );
}
