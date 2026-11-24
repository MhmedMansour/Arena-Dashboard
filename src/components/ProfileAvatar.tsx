import {
  DraftingCompass,
  Cpu,
  Wrench,
  Zap,
  Building2,
  Layers,
  HardHat,
} from "lucide-react";
import {
  AvailabilityStatus,
  AvatarFrame,
  AvatarShape,
  BrandIconId,
  ProfileSettings,
} from "../types/mhmed";

interface ProfileAvatarProps {
  profile: ProfileSettings;
  size?: "sm" | "md" | "lg" | "xl";
  showStatusDot?: boolean;
  onClick?: () => void;
  title?: string;
}

const SIZE_MAP = {
  sm: 36,
  md: 46,
  lg: 74,
  xl: 108,
};

const AVAILABILITY_COLORS: Record<AvailabilityStatus, string> = {
  available: "#34d399",
  "on-site": "#f59e0b",
  office: "#38bdf8",
  busy: "#f87171",
};

export function getShapeClass(shape: AvatarShape): string {
  switch (shape) {
    case "circle":
      return "mh-av-circle";
    case "rounded":
      return "mh-av-rounded";
    case "square":
      return "mh-av-square";
    case "hexagon":
      return "mh-av-hexagon";
    case "shield":
      return "mh-av-shield";
    default:
      return "mh-av-circle";
  }
}

export function getFrameClass(frame: AvatarFrame): string {
  switch (frame) {
    case "copper":
      return "mh-frame-copper";
    case "glow":
      return "mh-frame-glow";
    case "solid":
      return "mh-frame-solid";
    case "none":
    default:
      return "mh-frame-none";
  }
}

export function ProfileAvatar({
  profile,
  size = "sm",
  showStatusDot = false,
  onClick,
  title,
}: ProfileAvatarProps) {
  const px = SIZE_MAP[size];
  const shapeClass = getShapeClass(profile.avatarShape);
  const frameClass = getFrameClass(profile.avatarFrame);
  const initials =
    profile.shortInitials?.trim() ||
    profile.displayName?.trim().slice(0, 1) ||
    "M";

  const content = (
    <span
      className={`mh-avatar-shell ${frameClass} ${shapeClass}`}
      style={{ width: px, height: px }}
    >
      <span className={`mh-avatar-inner ${shapeClass}`}>
        {profile.avatarUrl ? (
          <img
            src={profile.avatarUrl}
            alt={profile.displayName}
            className="mh-avatar-img"
          />
        ) : (
          <span
            className="mh-avatar-initials"
            style={{ fontSize: Math.max(13, Math.round(px * 0.4)) }}
          >
            {initials}
          </span>
        )}
      </span>
      {showStatusDot && (
        <span
          className="mh-status-dot"
          style={{ backgroundColor: AVAILABILITY_COLORS[profile.availability] }}
          title={profile.availabilityLabel}
        />
      )}
    </span>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className="mh-avatar-btn"
        onClick={onClick}
        title={title || profile.displayName}
      >
        {content}
      </button>
    );
  }

  return (
    <span className="mh-avatar-btn" title={title || profile.displayName}>
      {content}
    </span>
  );
}

interface BrandMarkProps {
  icon: BrandIconId;
  customLogo?: string;
  size?: number;
}

export function BrandMark({ icon, customLogo, size = 26 }: BrandMarkProps) {
  if (icon === "custom" && customLogo) {
    return (
      <img
        src={customLogo}
        alt="Brand Logo"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          borderRadius: "inherit",
        }}
      />
    );
  }

  switch (icon) {
    case "cpu":
      return <Cpu size={size} />;
    case "wrench":
      return <Wrench size={size} />;
    case "zap":
      return <Zap size={size} />;
    case "building":
      return <Building2 size={size} />;
    case "layers":
      return <Layers size={size} />;
    case "hardhat":
      return <HardHat size={size} />;
    case "compass":
    default:
      return <DraftingCompass size={size} />;
  }
}
