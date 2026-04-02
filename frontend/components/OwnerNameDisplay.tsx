import React from 'react';

interface Props {
    name: string;
    className?: string;
}

export default function OwnerNameDisplay({ name, className = '' }: Props) {
    if (!name) return null;

    if (!name.includes('||')) {
        return <span className={`font-bold ${className}`}>{name}</span>;
    }

    const parts = name.split('||').map(p => p.trim());
    const oldOwners = parts.slice(0, -1);
    const newOwner = parts[parts.length - 1];

    return (
        <div className={`flex flex-col gap-0.5 leading-tight ${className}`}>
            {oldOwners.map((o, i) => (
                <span key={i} className="line-through text-gray-500 text-[0.85em]">
                    {o}
                </span>
            ))}
            <span className="font-black">{newOwner}</span>
        </div>
    );
}
