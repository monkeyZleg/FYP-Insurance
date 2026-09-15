import { ethers } from "ethers";

export function getProvider() {
  if (typeof window === "undefined" || !window.ethereum) return null;
  return new ethers.BrowserProvider(window.ethereum);
}

export async function getSigner() {
  const provider = getProvider();
  if (!provider) return null;
  await provider.send("eth_requestAccounts", []);
  return provider.getSigner();
}
