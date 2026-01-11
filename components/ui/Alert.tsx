import React from 'react';
import { AlertItem } from '../../utils/alerts';

interface AlertProps {
    alert: AlertItem;
    onDismiss: (id: string) => void;
}

export const Alert: React.FC<AlertProps> = ({ alert, onDismiss }) => {
    const styles = {
        success: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', icon: '✅' },
        warning: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', icon: '⚠️' },
        critical: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', icon: '❌' },
    };

    const style = styles[alert.type];

    return (
        <div className={`relative flex items-start gap-3 p-4 rounded-xl border ${style.bg} ${style.border} animate-fade-in-down mb-3`}>
            <span className="text-xl">{style.icon}</span>
            <div className="flex-1">
                <h4 className={`font-bold text-sm ${style.text} mb-1`}>{alert.title}</h4>
                <p className="text-xs text-gray-400 leading-relaxed">{alert.message}</p>
            </div>
            <button
                onClick={() => onDismiss(alert.id)}
                className="text-gray-500 hover:text-white transition-colors"
            >
                ✕
            </button>
        </div>
    );
};
