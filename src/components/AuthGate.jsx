import React,{useState} from "react";
import {ArrowRight,LogIn,ShieldCheck,UserPlus} from "lucide-react";
import {signIn,signUp} from "../services/nfiRepository";

export default function AuthGate({onAuthenticated}){
 const [mode,setMode]=useState("login");
 const [name,setName]=useState(""); const [email,setEmail]=useState(""); const [password,setPassword]=useState("");
 const [busy,setBusy]=useState(false); const [error,setError]=useState(""); const [message,setMessage]=useState("");
 const submit=async e=>{e.preventDefault();setBusy(true);setError("");setMessage("");try{
   if(mode==="login"){const {user}=await signIn(email.trim(),password);onAuthenticated?.(user);}
   else {const {user,session}=await signUp(email.trim(),password,name.trim()); if(session?.user) onAuthenticated?.(session.user); else setMessage("Compte créé. Vérifiez votre adresse email pour activer votre accès, puis connectez-vous.");}
 }catch(err){setError(err.message||"Opération impossible")}finally{setBusy(false)}};
 return <div className="authPage">
   <div className="authGlow authGlowOne"/><div className="authGlow authGlowTwo"/>
   <section className="authShell">
    <div className="authBrand"><div className="authLogo"><span>N</span>FI</div><div><strong>NOVACAB</strong><small>Financial Intelligence</small></div></div>
    <div className="authGrid">
      <div className="authIntro"><div className="eyebrow">NFI · FINANCIAL INTELLIGENCE</div><h1>L'analyse financière qui vous accompagne.</h1><p>Analysez, comparez et comprenez les performances d'une entreprise dans un espace pensé pour les professionnels.</p><div className="authFeatures"><div><b>01</b><span>Analyse financière</span></div><div><b>02</b><span>Comparaisons sectorielles</span></div><div><b>03</b><span>Votre espace, vos données</span></div></div></div>
      <div className="authCard">
       <div className="authTabs"><button className={mode==="login"?"active":""} onClick={()=>{setMode("login");setError("");setMessage("")}}>Se connecter</button><button className={mode==="signup"?"active":""} onClick={()=>{setMode("signup");setError("");setMessage("")}}>Créer un compte</button></div>
       <div className="eyebrow">ESPACE SÉCURISÉ</div><h2>{mode==="login"?"Bienvenue dans NFI":"Créer votre espace NFI"}</h2><p>{mode==="login"?"Les utilisateurs NOVACAB retrouvent automatiquement leurs dossiers et leurs droits.":"Créez un espace indépendant pour importer vos propres sociétés et effectuer vos comparaisons, sans accès aux données NOVACAB."}</p>
       <form onSubmit={submit} className="authForm">
        {mode==="signup"&&<label>Nom et prénom<input value={name} onChange={e=>setName(e.target.value)} autoComplete="name" required/></label>}
        <label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" required/></label>
        <label>Mot de passe<input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete={mode==="login"?"current-password":"new-password"} minLength={8} required/><small>8 caractères minimum</small></label>
        {error&&<div className="notice warningNotice">{error}</div>}{message&&<div className="notice qualityOk">{message}</div>}
        <button className="primary fullButton" disabled={busy}>{mode==="login"?<LogIn size={16}/>:<UserPlus size={16}/>} {busy?(mode==="login"?"Connexion…":"Création…"):(mode==="login"?"Se connecter":"Créer mon compte")}<ArrowRight size={15}/></button>
       </form>
       <div className="authTrust"><ShieldCheck size={15}/><span>Les espaces personnels sont isolés des données et dossiers NOVACAB.</span></div>
      </div>
    </div>
   </section>
 </div>;
}
