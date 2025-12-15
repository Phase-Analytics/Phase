'use client';

import { type HTMLMotionProps, motion } from 'motion/react';
import { type Ref, useEffect, useState } from 'react';
import { getStrictContext } from '@/hooks/get-strict-context';
import { type UseIsInViewOptions, useIsInView } from '@/hooks/use-is-in-view';

type TypingTextContextType = {
  isTyping: boolean;
  setIsTyping: (isTyping: boolean) => void;
};

const [TypingTextProvider, useTypingText] =
  getStrictContext<TypingTextContextType>('TypingTextContext');

type TypingTextProps = React.ComponentProps<'span'> & {
  duration?: number;
  delay?: number;
  loop?: boolean;
  holdDelay?: number;
  text: string | string[];
} & UseIsInViewOptions;

function TypingText({
  ref,
  children,
  duration = 100,
  delay = 0,
  inView = false,
  inViewMargin = '0px',
  inViewOnce = true,
  loop = false,
  holdDelay = 1000,
  text,
  ...props
}: TypingTextProps) {
  const { ref: localRef, isInView } = useIsInView(ref as Ref<HTMLElement>, {
    inView,
    inViewOnce,
    inViewMargin,
  });

  const [isTyping, setIsTyping] = useState(false);
  const [started, setStarted] = useState(false);
  const [displayedText, setDisplayedText] = useState<string>('');

  useEffect(() => {
    if (isInView) {
      const timeoutId = setTimeout(() => {
        setStarted(true);
      }, delay);
      return () => clearTimeout(timeoutId);
    }
  }, [isInView, delay]);

  useEffect(() => {
    if (!started) {
      return;
    }

    const timeoutIds: ReturnType<typeof setTimeout>[] = [];
    const texts: string[] = typeof text === 'string' ? [text] : text;

    const typeText = (str: string, onComplete: () => void) => {
      setIsTyping(true);
      let currentIndex = 0;
      const type = () => {
        if (currentIndex <= str.length) {
          setDisplayedText(str.substring(0, currentIndex));
          currentIndex++;
          const id = setTimeout(type, duration);
          timeoutIds.push(id);
        } else {
          setIsTyping(false);
          onComplete();
        }
      };
      type();
    };

    const eraseText = (str: string, onComplete: () => void) => {
      setIsTyping(true);
      let currentIndex = str.length;
      const erase = () => {
        if (currentIndex >= 0) {
          setDisplayedText(str.substring(0, currentIndex));
          currentIndex--;
          const id = setTimeout(erase, duration);
          timeoutIds.push(id);
        } else {
          setIsTyping(false);
          onComplete();
        }
      };
      erase();
    };

    const animateTexts = (index: number) => {
      typeText(texts[index] ?? '', () => {
        const isLast = index === texts.length - 1;
        if (isLast && !loop) {
          return;
        }
        const id = setTimeout(() => {
          eraseText(texts[index] ?? '', () => {
            const nextIndex = isLast ? 0 : index + 1;
            animateTexts(nextIndex);
          });
        }, holdDelay);
        timeoutIds.push(id);
      });
    };

    animateTexts(0);

    return () => {
      timeoutIds.forEach(clearTimeout);
    };
  }, [text, duration, started, loop, holdDelay]);

  return (
    <TypingTextProvider value={{ isTyping, setIsTyping }}>
      <span data-slot="typing-text" ref={localRef} {...props}>
        <motion.span>{displayedText}</motion.span>
        {children}
      </span>
    </TypingTextProvider>
  );
}

type TypingTextCursorProps = Omit<HTMLMotionProps<'span'>, 'children'>;

function TypingTextCursor({
  style,
  variants,
  ...props
}: TypingTextCursorProps) {
  const { isTyping } = useTypingText();

  return (
    <motion.span
      animate={isTyping ? 'visible' : 'blinking'}
      data-slot="typing-text-cursor"
      style={{
        display: 'inline-block',
        height: '16px',
        transform: 'translateY(2px)',
        width: '1px',
        backgroundColor: 'currentColor',
        ...style,
      }}
      variants={{
        blinking: {
          opacity: [0, 0, 1, 1],
          transition: {
            duration: 1,
            repeat: Number.POSITIVE_INFINITY,
            repeatDelay: 0,
            ease: 'linear',
            times: [0, 0.5, 0.5, 1],
          },
        },
        visible: {
          opacity: 1,
        },
        ...variants,
      }}
      {...props}
    />
  );
}

export {
  TypingText,
  TypingTextCursor,
  type TypingTextProps,
  type TypingTextCursorProps,
};
