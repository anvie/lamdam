import { Inter as FontInter, Lato as FontLato, Fira_Code as FontMono } from "next/font/google"

export const fontInter = FontInter({
  subsets: ["latin"],
  variable: "--font-inter",
})

export const fontMono = FontMono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["300", "400", "500", "600", "700"]
})

export const fontLato = FontLato({
  subsets: ["latin"],
  variable: "--font-lato",
  weight: ["300", "400", "700", "900"]
})

const fonts = [fontInter.variable, fontMono.variable, fontLato.variable]

export default fonts