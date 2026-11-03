"use client";

import { LoaderCircle, Trash2 } from "lucide-react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { deleteAccountAction, type DeleteAccountState } from "./actions";

const initialState: DeleteAccountState = { status: "idle", message: "" };

export function DeleteAccountForm() {
  const [state, action, pending] = useActionState(deleteAccountAction, initialState);
  return <form action={action} className="mt-5"><label className="text-xs font-extrabold tracking-wide uppercase">Confirmation<Input autoComplete="off" className="mt-2" name="confirmation" placeholder="DELETE MY DATA" /></label><Button className="mt-4" disabled={pending} type="submit" variant="destructive">{pending ? <LoaderCircle className="animate-spin" /> : <Trash2 />}{pending ? "Đang xóa…" : "Xóa vĩnh viễn"}</Button>{state.message ? <p className="mt-3 text-sm font-semibold text-destructive">{state.message}</p> : null}</form>;
}
