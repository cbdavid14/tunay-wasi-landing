interface IcoProps {
  size?: number;
  strokeWidth?: number;
  fill?: string;
  style?: React.CSSProperties;
}

const Ico = ({ size = 20, strokeWidth = 1.75, fill = 'none', children, ...rest }: IcoProps & React.SVGProps<SVGSVGElement>) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...rest}>
    {children}
  </svg>
);

export const IconHome = (p: IcoProps) => <Ico {...p}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></Ico>;
export const IconBag = (p: IcoProps) => <Ico {...p}><path d="M6 8h12l-1 12H7L6 8Z" /><path d="M9 8a3 3 0 0 1 6 0" /></Ico>;
export const IconRepeat = (p: IcoProps) => <Ico {...p}><path d="M17 2.5 20.5 6 17 9.5" /><path d="M3.5 11V9a3 3 0 0 1 3-3h14" /><path d="M7 21.5 3.5 18 7 14.5" /><path d="M20.5 13v2a3 3 0 0 1-3 3h-14" /></Ico>;
export const IconClock = (p: IcoProps) => <Ico {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Ico>;
export const IconMapPin = (p: IcoProps) => <Ico {...p}><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></Ico>;
export const IconCheck = (p: IcoProps) => <Ico {...p}><path d="M4 12.5 9 17.5 20 6.5" /></Ico>;
export const IconX = (p: IcoProps) => <Ico {...p}><path d="M6 6l12 12M18 6 6 18" /></Ico>;
export const IconPlus = (p: IcoProps) => <Ico {...p}><path d="M12 5v14M5 12h14" /></Ico>;
export const IconMinus = (p: IcoProps) => <Ico {...p}><path d="M5 12h14" /></Ico>;
export const IconChevR = (p: IcoProps) => <Ico {...p}><path d="m9 5 7 7-7 7" /></Ico>;
export const IconChevL = (p: IcoProps) => <Ico {...p}><path d="m15 5-7 7 7 7" /></Ico>;
export const IconArrowR = (p: IcoProps) => <Ico {...p}><path d="M4 12h15" /><path d="m13 6 6 6-6 6" /></Ico>;
export const IconChevD = (p: IcoProps) => <Ico {...p}><path d="m6 9 6 6 6-6" /></Ico>;
export const IconTruck = (p: IcoProps) => <Ico {...p}><path d="M2 6.5h11v9H2z" /><path d="M13 9.5h4l3 3.2v2.8h-7Z" /><circle cx="6.5" cy="17.5" r="1.8" /><circle cx="17.5" cy="17.5" r="1.8" /></Ico>;
export const IconStar = (p: IcoProps) => <Ico {...p}><path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.6 1-5.8-4.3-4.1 5.9-.9Z" /></Ico>;
export const IconUser = (p: IcoProps) => <Ico {...p}><circle cx="12" cy="8" r="4" /><path d="M4 20c1.5-4 12.5-4 16 0" /></Ico>;
export const IconCoffee = (p: IcoProps) => <Ico {...p}><path d="M4 8h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Z" /><path d="M17 9h2.2a2.3 2.3 0 0 1 0 5H17" /><path d="M8 3.5c-.5.8-.5 1.7 0 2.5M12 3.5c-.5.8-.5 1.7 0 2.5" /></Ico>;
export const IconMenu = (p: IcoProps) => <Ico {...p}><path d="M4 7h16M4 12h16M4 17h16" /></Ico>;
export const IconPackage = (p: IcoProps) => <Ico {...p}><path d="M12 3 4 7v10l8 4 8-4V7Z" /><path d="m4 7 8 4 8-4M12 11v10" /></Ico>;
export const IconMail = (p: IcoProps) => <Ico {...p}><path d="M3 6.5h18v11H3z" /><path d="m3.5 7 8.5 6 8.5-6" /></Ico>;
export const IconLock = (p: IcoProps) => <Ico {...p}><path d="M6 10.5h12V20H6z" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /><path d="M12 14v2.5" /></Ico>;
export const IconPhone = (p: IcoProps) => <Ico {...p}><path d="M6 3.5h3l1.5 4-2 1.5a11 11 0 0 0 4.5 4.5l1.5-2 4 1.5v3a1.5 1.5 0 0 1-1.6 1.5C13 21 3 16 3 6.1A1.5 1.5 0 0 1 4.5 4.5" /></Ico>;
export const IconLogout = (p: IcoProps) => <Ico {...p}><path d="M14 4.5H6.5A1.5 1.5 0 0 0 5 6v12a1.5 1.5 0 0 0 1.5 1.5H14" /><path d="M17 8.5 20.5 12 17 15.5" /><path d="M10 12h10.5" /></Ico>;
export const IconEye = (p: IcoProps) => <Ico {...p}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="2.8" /></Ico>;
export const IconEyeOff = (p: IcoProps) => <Ico {...p}><path d="M4 4l16 16" /><path d="M9.5 5.9A9.8 9.8 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-3.2 3.8M6.2 7.7A16 16 0 0 0 2.5 12S6 18.5 12 18.5a9 9 0 0 0 2.9-.5" /></Ico>;
export const IconTicket = (p: IcoProps) => <Ico {...p}><path d="M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5V10a2 2 0 0 0 0 4v2.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 16.5V14a2 2 0 0 0 0-4Z" /><path d="M14 6v12" strokeDasharray="2 2.5" /></Ico>;
export const IconGift = (p: IcoProps) => <Ico {...p}><path d="M4 11h16v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z" /><path d="M3 8h18v3H3z" /><path d="M12 8v12" /><path d="M12 8S11 4 8.5 4A2 2 0 0 0 8.5 8H12Zm0 0s1-4 3.5-4A2 2 0 0 1 15.5 8H12Z" /></Ico>;
export const IconUsers = (p: IcoProps) => <Ico {...p}><circle cx="9" cy="8" r="3.2" /><path d="M3 20c1-4 11-4 12 0" /><path d="M16 5.2A3 3 0 0 1 16 11M21 20c-.4-2-2-3.2-4-3.6" /></Ico>;
export const IconTrophy = (p: IcoProps) => <Ico {...p}><path d="M7 4h10v5a5 5 0 0 1-10 0Z" /><path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3" /><path d="M10 14h4M9 20h6M12 14v6" /></Ico>;
export const IconCopy = (p: IcoProps) => <Ico {...p}><rect x="8.5" y="8.5" width="11" height="11" rx="2" /><path d="M5.5 15.5A2 2 0 0 1 4 13.5v-8A2 2 0 0 1 6 3.5h8a2 2 0 0 1 2 1.5" /></Ico>;
export const IconPause = (p: IcoProps) => <Ico {...p}><path d="M8 5v14M16 5v14" /></Ico>;
export const IconPlay = (p: IcoProps) => <Ico {...p}><path d="M7 4.5 19 12 7 19.5Z" /></Ico>;
export const IconTrash = (p: IcoProps) => <Ico {...p}><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" /></Ico>;
export const IconEdit = (p: IcoProps) => <Ico {...p}><path d="M5 19h14" /><path d="M15.5 4.5 19.5 8.5 9 19l-4.5 1 1-4.5Z" /></Ico>;
export const IconShare = (p: IcoProps) => <Ico {...p}><circle cx="6" cy="12" r="2.4" /><circle cx="17.5" cy="6" r="2.4" /><circle cx="17.5" cy="18" r="2.4" /><path d="M8.1 11 15.4 7.1M8.1 13l7.3 3.9" /></Ico>;
export const IconChat = (p: IcoProps) => <Ico {...p}><path d="M4 5.5h16v10H9l-4 3.5v-3.5H4Z" /><path d="M8.5 10.5h7M8.5 13h4" /></Ico>;
export const IconLink = (p: IcoProps) => <Ico {...p}><path d="M10 14a3.5 3.5 0 0 0 5 0l3-3a3.5 3.5 0 0 0-5-5l-1.5 1.5" /><path d="M14 10a3.5 3.5 0 0 0-5 0l-3 3a3.5 3.5 0 0 0 5 5l1.5-1.5" /></Ico>;
export const IconGrid = (p: IcoProps) => <Ico {...p}><rect x="3.5" y="3.5" width="7" height="7" rx="1.3" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.3" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.3" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.3" /></Ico>;
export const IconTag = (p: IcoProps) => <Ico {...p}><path d="M3.5 11.5V4.5a1 1 0 0 1 1-1h7l8.5 8.5a1.4 1.4 0 0 1 0 2L13.5 21a1.4 1.4 0 0 1-2 0L3.5 12.5a1.4 1.4 0 0 1 0-1Z" /><circle cx="8" cy="8" r="1.5" /></Ico>;
export const IconUpload = (p: IcoProps) => <Ico {...p}><path d="M12 16V5" /><path d="m7.5 9.5 4.5-4.5 4.5 4.5" /><path d="M5 17.5V20h14v-2.5" /></Ico>;
export const IconQr = (p: IcoProps) => <Ico {...p}><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z" /><path d="M14 14h2.5v2.5H14zM19.5 14H20v.5M14 19.5h2.5V20M19.5 19.5H20" /></Ico>;
export const IconHeart = (p: IcoProps) => <Ico {...p}><path d="M12 20s-7-4.7-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.3-7 10-7 10Z" /></Ico>;
export const IconMountain = (p: IcoProps) => <Ico {...p}><path d="m3 19 6-11 4 7 2-3 6 7H3Z" /></Ico>;
export const IconSparkle = (p: IcoProps) => <Ico {...p}><path d="M12 3.5 13.6 9 19 10.6 13.6 12.2 12 17.7 10.4 12.2 5 10.6 10.4 9Z" /><path d="M19 3v3M20.5 4.5h-3" /></Ico>;
export const IconBell = (p: IcoProps) => <Ico {...p}><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" /><path d="M10 19a2 2 0 0 0 4 0" /></Ico>;
export const IconGlobe = (p: IcoProps) => <Ico {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></Ico>;
export const IconShield = (p: IcoProps) => <Ico {...p}><path d="M12 3 5 6v5c0 5 3.5 8 7 10 3.5-2 7-5 7-10V6Z" /><path d="m9 12 2 2 4-4" /></Ico>;
export const IconCard = (p: IcoProps) => <Ico {...p}><rect x="3" y="5.5" width="18" height="13" rx="2" /><path d="M3 9.5h18M6.5 14.5h4" /></Ico>;
export const IconMore = (p: IcoProps) => <Ico {...p}><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></Ico>;
export const IconLeaf = (p: IcoProps) => <Ico {...p}><path d="M4 20c0-9 7-15 16-15 0 9-6 16-15 16a8 8 0 0 1-1-1Z" /><path d="M9 15c3-3 6-4 9-4" /></Ico>;
export const IconSettings = (p: IcoProps) => <Ico {...p}><circle cx="12" cy="12" r="3" /><path d="M12 2.5v2.2M12 19.3v2.2M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6" /></Ico>;

export const Colibri = ({ size = 28, accent = '#c96e4b' }: { size?: number; accent?: string }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <g stroke="#1f3028" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 26c2.5 1 5.5 1 8-.5 2-1.2 3.4-3 4.2-5" fill="none" />
      <path d="M20 26c-1.5-1.5-2-3.5-1.4-5.6.5-1.8 1.9-3.3 3.7-3.9" />
      <circle cx="26.5" cy="16.5" r="2.4" fill={accent} />
      <path d="M28.6 15.4 35 12" />
      <path d="M21 21c-3.2-2.6-7-3.4-11-2 2 3 4.6 5 8 5.6" fill="none" />
      <path d="M19.6 25.4 13 31M21 26l-3.5 6.5" />
    </g>
  </svg>
);
