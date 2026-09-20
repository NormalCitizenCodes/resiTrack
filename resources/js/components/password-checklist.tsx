import { Check, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

type Rule = { label: string; passed: boolean };

/**
 * Turns the server's password rules string (Laravel's toPasswordRulesString(),
 * e.g. "minlength: 8;" locally or "minlength: 12; required: lower; required:
 * upper; required: digit; required: [symbols];" in production) into a checklist,
 * so what the form promises always matches what the server will enforce.
 */
export function buildPasswordRules(rules: string, password: string): Rule[] {
    const min = Number(/minlength:\s*(\d+)/.exec(rules)?.[1] ?? 8);
    const items: Rule[] = [{ label: `At least ${min} characters`, passed: password.length >= min }];

    if (/required:\s*lower/.test(rules)) {
        items.push({ label: 'A lowercase letter', passed: /[a-z]/.test(password) });
    }

    if (/required:\s*upper/.test(rules)) {
        items.push({ label: 'An uppercase letter', passed: /[A-Z]/.test(password) });
    }

    if (/required:\s*digit/.test(rules)) {
        items.push({ label: 'A number', passed: /\d/.test(password) });
    }

    if (/required:\s*\[/.test(rules)) {
        items.push({ label: 'A symbol, such as ! or @', passed: /[^A-Za-z0-9]/.test(password) });
    }

    return items;
}

export function PasswordChecklist({
    rules,
    password,
    confirmation,
}: {
    rules: string;
    password: string;
    /** Pass the confirmation field's value to also show a "passwords match" line. */
    confirmation?: string;
}) {
    const items = buildPasswordRules(rules, password);

    if (confirmation !== undefined) {
        items.push({
            label: 'Both passwords match',
            passed: confirmation.length > 0 && confirmation === password,
        });
    }

    return (
        <ul className="grid gap-1.5 text-sm" aria-label="Password requirements">
            {items.map((item) => (
                <li
                    key={item.label}
                    className={cn(
                        'flex items-center gap-2 transition-colors',
                        item.passed ? 'text-success-text' : 'text-muted-foreground',
                    )}
                >
                    <span
                        aria-hidden="true"
                        className={cn(
                            'flex size-4 shrink-0 items-center justify-center rounded-full border',
                            item.passed ? 'border-success bg-success text-success-foreground' : 'border-border',
                        )}
                    >
                        {item.passed ? <Check className="size-3" /> : <Circle className="size-1.5 fill-current opacity-0" />}
                    </span>
                    {item.label}
                    <span className="sr-only">{item.passed ? ', done' : ', not yet'}</span>
                </li>
            ))}
        </ul>
    );
}
