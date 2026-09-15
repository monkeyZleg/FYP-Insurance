"use client";
import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";

declare global {
  interface Window {
    ethereum?: ethers.Eip1193Provider & {
      on: (event: string, cb: (...args: unknown[]) => void) => void;
      removeAllListeners: (event: string) => void;
    };
  }
}

export function useMetaMask() {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [address, setAddress] = useState<string>("");

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      alert("MetaMask not installed. Please install it to use this app.");
      return;
    }
    const p = new ethers.BrowserProvider(window.ethereum);
    await p.send("eth_requestAccounts", []);
    const s = await p.getSigner();
    setProvider(p);
    setSigner(s);
    setAddress(await s.getAddress());
  }, []);

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", () => connect());
      return () => window.ethereum?.removeAllListeners("accountsChanged");
    }
  }, [connect]);

  return { provider, signer, address, connect };
}
