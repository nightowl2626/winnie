import { colors } from "./tokens";

export type AuroraOrb = {
  color: string;
  x: string;
  y: string;
  size: string;
};

export type AuroraConfig = {
  orbs: AuroraOrb[];
  cssBackground: string;
  animationDuration: string;
};

export type AuroraMode = "default" | "scan" | "stylist" | "wishlist" | "shop";

export const auroraConfigs: Record<AuroraMode, AuroraConfig> = {
  default: {
    orbs: [
      { color: "rgba(255,118,82,0.12)", x: "15%", y: "10%", size: "52%" },
      { color: "rgba(200,154,99,0.1)", x: "80%", y: "28%", size: "46%" },
      { color: "rgba(141,121,104,0.08)", x: "50%", y: "70%", size: "50%" },
      { color: "rgba(233,221,211,0.2)", x: "28%", y: "90%", size: "62%" },
    ],
    cssBackground: [
      "radial-gradient(circle at 15% 10%, rgba(255,118,82,0.18) 0%, rgba(255,118,82,0.09) 20%, transparent 54%)",
      "radial-gradient(circle at 80% 30%, rgba(200,154,99,0.16) 0%, rgba(200,154,99,0.08) 18%, transparent 50%)",
      "radial-gradient(circle at 50% 70%, rgba(141,121,104,0.12) 0%, rgba(141,121,104,0.06) 18%, transparent 52%)",
      "radial-gradient(circle at 30% 95%, rgba(233,221,211,0.22) 0%, rgba(233,221,211,0.08) 24%, transparent 58%)",
      `linear-gradient(165deg, #FBF4EC 0%, #F8EDE3 34%, #F1E6DD 68%, #ECE4DD 100%)`,
    ].join(", "),
    animationDuration: "14s",
  },

  scan: {
    orbs: [
      { color: "rgba(200,154,99,0.12)", x: "30%", y: "28%", size: "48%" },
      { color: "rgba(176,138,104,0.08)", x: "70%", y: "62%", size: "42%" },
      { color: "rgba(255,118,82,0.06)", x: "52%", y: "84%", size: "30%" },
    ],
    cssBackground: [
      "radial-gradient(circle at 30% 30%, rgba(200,154,99,0.18) 0%, rgba(200,154,99,0.08) 20%, transparent 54%)",
      "radial-gradient(circle at 70% 65%, rgba(176,138,104,0.14) 0%, rgba(176,138,104,0.06) 18%, transparent 48%)",
      "radial-gradient(circle at 50% 85%, rgba(255,118,82,0.1) 0%, rgba(255,118,82,0.04) 18%, transparent 44%)",
      `linear-gradient(135deg, #FBF5EE, #F2E7DD)`,
    ].join(", "),
    animationDuration: "10s",
  },

  stylist: {
    orbs: [
      { color: "rgba(255,118,82,0.14)", x: "35%", y: "25%", size: "52%" },
      { color: "rgba(200,154,99,0.08)", x: "65%", y: "60%", size: "40%" },
      { color: "rgba(141,121,104,0.08)", x: "25%", y: "82%", size: "32%" },
    ],
    cssBackground: [
      "radial-gradient(circle at 35% 25%, rgba(255,118,82,0.22) 0%, rgba(255,118,82,0.1) 22%, transparent 56%)",
      "radial-gradient(circle at 65% 60%, rgba(200,154,99,0.14) 0%, rgba(200,154,99,0.06) 18%, transparent 48%)",
      "radial-gradient(circle at 25% 80%, rgba(141,121,104,0.14) 0%, rgba(141,121,104,0.06) 18%, transparent 46%)",
      `linear-gradient(135deg, #FBF4EC, #F8ECE2)`,
    ].join(", "),
    animationDuration: "11s",
  },

  wishlist: {
    orbs: [
      { color: "rgba(141,121,104,0.12)", x: "40%", y: "22%", size: "50%" },
      { color: "rgba(255,118,82,0.08)", x: "60%", y: "65%", size: "38%" },
      { color: "rgba(200,154,99,0.08)", x: "30%", y: "76%", size: "36%" },
    ],
    cssBackground: [
      "radial-gradient(circle at 40% 20%, rgba(141,121,104,0.18) 0%, rgba(141,121,104,0.08) 20%, transparent 54%)",
      "radial-gradient(circle at 60% 65%, rgba(255,118,82,0.12) 0%, rgba(255,118,82,0.05) 18%, transparent 46%)",
      "radial-gradient(circle at 30% 75%, rgba(200,154,99,0.14) 0%, rgba(200,154,99,0.06) 18%, transparent 46%)",
      `linear-gradient(135deg, #FAF3EC, #F1E8DE)`,
    ].join(", "),
    animationDuration: "13s",
  },

  shop: {
    orbs: [
      { color: "rgba(200,154,99,0.14)", x: "25%", y: "30%", size: "50%" },
      { color: "rgba(255,118,82,0.08)", x: "70%", y: "55%", size: "40%" },
      { color: "rgba(141,121,104,0.08)", x: "50%", y: "80%", size: "35%" },
    ],
    cssBackground: [
      "radial-gradient(circle at 25% 30%, rgba(200,154,99,0.22) 0%, rgba(200,154,99,0.1) 22%, transparent 56%)",
      "radial-gradient(circle at 70% 55%, rgba(255,118,82,0.12) 0%, rgba(255,118,82,0.05) 18%, transparent 46%)",
      "radial-gradient(circle at 50% 80%, rgba(141,121,104,0.12) 0%, rgba(141,121,104,0.05) 18%, transparent 46%)",
      `linear-gradient(135deg, #FBF4EC, #F7EADF)`,
    ].join(", "),
    animationDuration: "12s",
  },
};
