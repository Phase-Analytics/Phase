'use client';

import { defaultKeymap, indentWithTab } from '@codemirror/commands';
import { sql } from '@codemirror/lang-sql';
import {
  defaultHighlightStyle,
  syntaxHighlighting,
} from '@codemirror/language';
import { Compartment, EditorState, type Extension } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import {
  EditorView,
  keymap,
  placeholder as placeholderExt,
} from '@codemirror/view';
import { useTheme } from 'next-themes';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

type SqlCodeEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onRun?: () => void;
  placeholder?: string;
  className?: string;
};

const lightEditorTheme = EditorView.theme(
  {
    '&': {
      backgroundColor: 'transparent',
    },
    '.cm-scroller': {
      fontFamily: 'var(--font-mono)',
    },
    '.cm-content': {
      caretColor: 'var(--foreground)',
      padding: '16px 0',
    },
    '.cm-gutters': {
      display: 'none',
    },
    '&.cm-focused': {
      outline: 'none',
    },
    '.cm-line': {
      padding: '0 16px',
    },
  },
  { dark: false }
);

const darkEditorTheme = EditorView.theme(
  {
    '&': {
      backgroundColor: 'transparent',
    },
    '.cm-scroller': {
      fontFamily: 'var(--font-mono)',
    },
    '.cm-content': {
      caretColor: 'var(--foreground)',
      padding: '16px 0',
    },
    '.cm-gutters': {
      display: 'none',
    },
    '&.cm-focused': {
      outline: 'none',
    },
    '.cm-line': {
      padding: '0 16px',
    },
  },
  { dark: true }
);

const baseEditorTheme = EditorView.theme({
  '.cm-scroller': {
    minHeight: '220px',
    fontSize: '13px',
    lineHeight: '1.625',
  },
});

const themeCompartment = new Compartment();
const placeholderCompartment = new Compartment();

function buildThemeExtensions(isDark: boolean): Extension[] {
  return isDark ? [oneDark, darkEditorTheme] : [lightEditorTheme];
}

export function SqlCodeEditor({
  value,
  onChange,
  onRun,
  placeholder = 'SELECT ...',
  className,
}: SqlCodeEditorProps) {
  const { resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onRunRef = useRef(onRun);
  const isInternalChangeRef = useRef(false);
  const initialValueRef = useRef(value);

  onChangeRef.current = onChange;
  onRunRef.current = onRun;

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const isDark = resolvedTheme === 'dark';
    const runKeymap = keymap.of([
      {
        key: 'Mod-Enter',
        run: () => {
          onRunRef.current?.();
          return true;
        },
      },
      ...defaultKeymap,
      indentWithTab,
    ]);

    const extensions: Extension[] = [
      baseEditorTheme,
      themeCompartment.of(buildThemeExtensions(isDark)),
      placeholderCompartment.of(placeholderExt(placeholder)),
      sql(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      runKeymap,
      EditorView.lineWrapping,
      EditorView.updateListener.of((update) => {
        if (!update.docChanged) {
          return;
        }

        isInternalChangeRef.current = true;
        onChangeRef.current(update.state.doc.toString());
      }),
    ];

    const view = new EditorView({
      state: EditorState.create({
        doc: initialValueRef.current,
        extensions,
      }),
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [placeholder, resolvedTheme]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) {
      return;
    }

    const isDark = resolvedTheme === 'dark';
    view.dispatch({
      effects: themeCompartment.reconfigure(buildThemeExtensions(isDark)),
    });
  }, [resolvedTheme]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) {
      return;
    }

    view.dispatch({
      effects: placeholderCompartment.reconfigure(placeholderExt(placeholder)),
    });
  }, [placeholder]);

  useEffect(() => {
    if (isInternalChangeRef.current) {
      isInternalChangeRef.current = false;
      return;
    }

    const view = viewRef.current;
    if (!view) {
      return;
    }

    const current = view.state.doc.toString();
    if (current === value) {
      return;
    }

    view.dispatch({
      changes: {
        from: 0,
        to: current.length,
        insert: value,
      },
    });
  }, [value]);

  return (
    <div
      className={cn(
        'min-h-[220px] overflow-hidden font-mono text-sm',
        className
      )}
      ref={containerRef}
    />
  );
}
