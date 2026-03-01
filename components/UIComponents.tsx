import React from 'react';

// Card Components
export interface CardProps {
  children?: React.ReactNode;
  className?: string;
}

export const Card = ({ children, className = "" }: CardProps) => (
  <div className={`rounded-xl bg-card text-card-foreground ${className}`}>
    {children}
  </div>
);

export const CardHeader = ({ children, className = "" }: CardProps) => (
  <div className={`flex flex-col space-y-1.5 p-5 ${className}`}>{children}</div>
);

export const CardTitle = ({ children, className = "" }: CardProps) => (
  <h3 className={`font-semibold leading-none tracking-tight text-[17px] ${className}`}>{children}</h3>
);

export const CardContent = ({ children, className = "" }: CardProps) => (
  <div className={`p-5 pt-0 ${className}`}>{children}</div>
);

// Button Component
interface ButtonProps extends React.ComponentProps<'button'> {
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const Button = ({ children, className = "", variant = 'default', size = 'default', ...props }: ButtonProps) => {
  const baseStyles = "inline-flex items-center justify-center rounded-lg text-[13px] font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
  
  const variants = {
    default: "bg-primary text-[#141413] hover:opacity-90",
    secondary: "bg-[#2C2C2E] text-[#141413] hover:bg-[#3A3A3C]",
    outline: "border border-[#2C2C2E] bg-transparent hover:bg-[#2C2C2E] text-[#141413]",
    ghost: "hover:bg-[#2C2C2E] text-[#b0aea5] hover:text-[#141413]",
  };

  const sizes = {
    default: "h-9 px-4 py-2",
    sm: "h-8 rounded-md px-3",
    lg: "h-11 rounded-md px-8",
    icon: "h-9 w-9",
  };

  return (
    <button className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  );
};

// Badge Component
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'outline' | 'secondary';
  className?: string;
}

export const Badge = ({ children, variant = 'default', className = "" }: BadgeProps) => {
  const variants = {
    default: "bg-primary text-[#141413]",
    secondary: "bg-[#2C2C2E] text-[#b0aea5]",
    outline: "border border-[#2C2C2E] text-[#b0aea5]",
  };
  
  return (
    <div className={`inline-flex items-center rounded text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 ${variants[variant]} ${className}`}>
      {children}
    </div>
  );
};