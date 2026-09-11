type IconProps = { className?: string };

function Svg({ className = "h-4 w-4", children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

export function IconDashboard({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.2" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.2" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.2" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.2" />
    </Svg>
  );
}

export function IconInvoices({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M7 3.5h7.2L20 9.3V20.5H7A1.5 1.5 0 0 1 5.5 19V5A1.5 1.5 0 0 1 7 3.5Z" />
      <path d="M14 3.5V9h6" />
      <path d="M8.5 13h7M8.5 16.5h4.5" />
    </Svg>
  );
}

export function IconClients({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="9" cy="8" r="2.6" />
      <path d="M4.5 18.5c.4-3 2.3-4.7 4.5-4.7s4.1 1.7 4.5 4.7" />
      <circle cx="16.2" cy="9" r="2.1" />
      <path d="M15 13.9c1.9.3 3.5 1.7 3.9 4.6" />
    </Svg>
  );
}

export function IconPlus({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

export function IconBilling({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="3.5" y="6" width="17" height="12" rx="2" />
      <path d="M3.5 10h17" />
      <path d="M7 15.2h4" />
    </Svg>
  );
}

export function IconSettings({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.8v1.8M12 18.4v1.8M4.9 6.8l1.3 1.3M17.8 15.9l1.3 1.3M3.8 12h1.8M18.4 12h1.8M4.9 17.2l1.3-1.3M17.8 8.1l1.3-1.3" />
    </Svg>
  );
}

export function IconLogout({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M10 5.5H7A1.5 1.5 0 0 0 5.5 7v10A1.5 1.5 0 0 0 7 18.5h3" />
      <path d="M10.5 12H19M15.5 8.5 19 12l-3.5 3.5" />
    </Svg>
  );
}

export function IconMenu({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M5 7h14M5 12h14M5 17h14" />
    </Svg>
  );
}

export function IconSellers({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4.5 19.5V9.2L12 4.5l7.5 4.7v10.3" />
      <path d="M9.5 19.5v-6h5v6" />
    </Svg>
  );
}

export function IconSubscriptions({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="5" y="4.5" width="14" height="15" rx="2" />
      <path d="M8.5 9h7M8.5 12.5h7M8.5 16h4" />
    </Svg>
  );
}

export function IconPayments({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v8M9.5 10.2c.6-.8 1.5-1.2 2.5-1.2 1.6 0 2.6.8 2.6 2 0 2.6-5.2 1.4-5.2 3.8 0 1.1 1 2 2.6 2 1.1 0 2-.5 2.5-1.3" />
    </Svg>
  );
}

export function IconMonitoring({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 18.5h16" />
      <path d="M6.5 15.5 10 10l3 4 4.5-7.5" />
    </Svg>
  );
}
