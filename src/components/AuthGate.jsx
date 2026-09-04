import React,{useEffect,useState} from "react";
import {LogIn, ShieldCheck} from "lucide-react";
import {signIn} from "../services/nfiRepository";

export default function AuthGate({onAuthenticated}){
 const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [busy,setBusy]=useState(false); const [error,setError]=useState("");
 const submit=async e=>{e.preventDefault();setBusy(true);setError("");try{const {user}=await signIn(email.trim(),password);onAuthenticated?.(user)}catch(err){setError(err.message||"Connexion impossible")}finally{setBusy(false)}};
 return <div className="app" style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"#f5f7fa"}}>
  <section className="panel" style={{width:"min(420px,calc(100% - 32px))",padding:32}}>
   <div className="brand" style={{marginBottom:28}}><div className="brandMark">N<span>F</span>I</div><div><strong>NOVACAB</strong><small>Financial Intelligence</small></div></div>
   <div className="eyebrow">ESPACE SÉCURISÉ</div><h1 style={{marginTop:6}}>Connexion NFI</h1>
   <p>Utilisez le même compte que dans NOVACAB. Vos droits et votre portefeuille sont récupérés depuis Supabase.</p>
   <form onSubmit={submit} style={{display:"grid",gap:12,marginTop:20}}>
    <label className="forecastField">Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="username" required /></label>
    <label className="forecastField">Mot de passe<input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" required /></label>
    {error&&<div className="notice warningNotice">{error}</div>}
    <button className="primary fullButton" disabled={busy}><LogIn size={15}/>{busy?"Connexion…":"Se connecter"}</button>
   </form>
   <div className="notice qualityOk" style={{marginTop:16}}><ShieldCheck size={14}/><div>Les données financières restent protégées par les règles d'accès Supabase (RLS).</div></div>
  </section>
 </div>;
}
