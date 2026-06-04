export interface GatewayTemplate {
  gateway_key: string;
  name: string;
  tagline: string;
  region: string;
  methods: string[];
  currencies: string[];
  logo_color: string;
  credential_fields: { key: string; label: string; placeholder: string; sensitive: boolean }[];
  test_cards: { number: string; type: string; cvv?: string; expiry?: string; pin?: string }[];
  docs_url: string;
  webhook_events: string[];
}

export const GATEWAY_TEMPLATES: GatewayTemplate[] = [
  {
    gateway_key: "flutterwave",
    name: "Flutterwave",
    tagline: "Pan-African payment infrastructure",
    region: "Nigeria, Ghana, Kenya, South Africa, Tanzania, Uganda",
    methods: ["Card", "Bank Transfer", "USSD", "Mobile Money", "Mpesa"],
    currencies: ["NGN", "GHS", "KES", "ZAR", "TZS", "UGX", "USD", "GBP", "EUR"],
    logo_color: "#F5A623",
    credential_fields: [
      { key: "public_key", label: "Public Key", placeholder: "FLWPUBK-xxxxxxxxxxxxxxxx-X", sensitive: false },
      { key: "secret_key", label: "Secret Key", placeholder: "FLWSECK-xxxxxxxxxxxxxxxx-X", sensitive: true },
      { key: "encryption_key", label: "Encryption Key", placeholder: "xxxxxxxxxxxxxxxx", sensitive: true },
    ],
    test_cards: [
      { number: "4187 4274 1046 2946", type: "Visa (Success)", cvv: "828", expiry: "09/32", pin: "3310" },
      { number: "5531 8866 5214 2950", type: "Mastercard (Success)", cvv: "564", expiry: "09/32", pin: "3310" },
      { number: "4187 4274 1046 2946", type: "Visa (Failed - No Funds)", cvv: "000", expiry: "09/32" },
    ],
    docs_url: "https://developer.flutterwave.com/docs",
    webhook_events: ["charge.completed", "transfer.completed", "payment.refunded", "subscription.cancelled"],
  },
  {
    gateway_key: "paystack",
    name: "Paystack",
    tagline: "Simple, modern payments for Africa",
    region: "Nigeria, Ghana, South Africa, Kenya",
    methods: ["Card", "Bank Transfer", "USSD", "Mobile Money", "QR"],
    currencies: ["NGN", "GHS", "ZAR", "KES", "USD"],
    logo_color: "#00C3F7",
    credential_fields: [
      { key: "public_key", label: "Public Key", placeholder: "pk_test_xxxxxxxxxxxxxxxx", sensitive: false },
      { key: "secret_key", label: "Secret Key", placeholder: "sk_test_xxxxxxxxxxxxxxxx", sensitive: true },
    ],
    test_cards: [
      { number: "4084 0840 8408 4081", type: "Visa (Success)", cvv: "408", expiry: "12/30" },
      { number: "5060 6666 6666 6666 666", type: "Verve (Success)", cvv: "123", expiry: "12/30" },
    ],
    docs_url: "https://paystack.com/docs/api",
    webhook_events: ["charge.success", "transfer.success", "transfer.failed", "refund.processed"],
  },
  {
    gateway_key: "payfast",
    name: "Payfast",
    tagline: "South Africa's trusted payment gateway",
    region: "South Africa",
    methods: ["Card", "Instant EFT", "Mobicred", "SCode", "SnapScan"],
    currencies: ["ZAR"],
    logo_color: "#00457C",
    credential_fields: [
      { key: "merchant_id", label: "Merchant ID", placeholder: "10000100", sensitive: false },
      { key: "merchant_key", label: "Merchant Key", placeholder: "46f0cd694581a", sensitive: true },
      { key: "passphrase", label: "Passphrase", placeholder: "Your passphrase", sensitive: true },
    ],
    test_cards: [
      { number: "Use Payfast sandbox dashboard", type: "Sandbox Mode" },
    ],
    docs_url: "https://developers.payfast.co.za/docs",
    webhook_events: ["COMPLETE", "CANCELLED", "FAILED"],
  },
];
