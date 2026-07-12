// Minimal typings for browser APIs injected at runtime (not in lib.dom.d.ts)

interface CyberSourceUnifiedPayments {
  show: (cfg: {
    containers: { paymentSelection: string; paymentScreen: string };
  }) => Promise<string | null>;
  complete: (token: string) => Promise<string>;
}

interface CyberSourceAcceptInstance {
  unifiedPayments: (guest: boolean) => Promise<CyberSourceUnifiedPayments>;
}

declare global {
  /** SpeechRecognitionEvent — may be absent from some TS DOM lib versions */
  interface SpeechRecognitionEvent extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
  }

  interface Window {
    /** Webkit vendor-prefixed SpeechRecognition (Chrome/Edge) */
    webkitSpeechRecognition?: typeof SpeechRecognition;
    /** CyberSource Unified Checkout SDK — injected via script tag */
    Accept?: (captureContext: string) => Promise<CyberSourceAcceptInstance>;
  }
}

export {};
