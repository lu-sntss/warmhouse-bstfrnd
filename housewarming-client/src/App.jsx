import { useEffect, useMemo, useRef, useState } from "react";
import "./index.css";

const API_URL = "http://localhost:8000";
const ADMIN_PASSWORD = "lucaslindodemais";

export default function App() {
  const [items, setItems] = useState([]);
  const [guests, setGuests] = useState([]);
  const [name, setName] = useState("");
  const [itemId, setItemId] = useState("");

  // menus / modals
  const [menuOpen, setMenuOpen] = useState(false);
  const [adminItemsOpen, setAdminItemsOpen] = useState(false);
  const [adminGuestsOpen, setAdminGuestsOpen] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);

  // admin lock
  const [isAdmin, setIsAdmin] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwd, setPwd] = useState("");
  const [pwdErr, setPwdErr] = useState("");
  const pwdInputRef = useRef(null);

  // cadastrar item
  const [newItemName, setNewItemName] = useState("");
  const [newItemMax, setNewItemMax] = useState("");
  const [newItemNote, setNewItemNote] = useState("");

  // edição itens
  const [editItem, setEditItem] = useState({}); // { [id]: {name,max_qty,note,dirty,saving} }

  // administração de convidados
  const [guestEdit, setGuestEdit] = useState({}); // { [guestId]: {item_id, dirty, saving} }
  const [guestFilter, setGuestFilter] = useState("");

  // ── data load ─────────────────────────────────────────────
  async function fetchAll() {
    const [it, gs] = await Promise.all([
      fetch(`${API_URL}/items`).then(r => r.json()),
      fetch(`${API_URL}/guests`).then(r => r.json()),
    ]);
    setItems(it);
    setGuests(gs);
    setEditItem({});
    setGuestEdit({});
  }

  useEffect(() => {
    fetchAll();
    const flag = localStorage.getItem("hw_is_admin");
    if (flag === "1") setIsAdmin(true);
  }, []);

  useEffect(() => {
    if (pwdOpen) setTimeout(() => pwdInputRef.current?.focus(), 50);
    else { setPwd(""); setPwdErr(""); }
  }, [pwdOpen]);

  // ── auth ─────────────────────────────────────────────────
  function handleGearClick() {
    if (!isAdmin) setPwdOpen(true);
    else setMenuOpen(v => !v);
  }
  function submitPassword(e) {
    e.preventDefault();
    if (pwd === ADMIN_PASSWORD) {
      setIsAdmin(true);
      localStorage.setItem("hw_is_admin", "1");
      setPwdOpen(false);
      setMenuOpen(true);
    } else setPwdErr("Senha incorreta. Tente novamente.");
  }

  // ── RSVP público ─────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !itemId) return;
    const res = await fetch(`${API_URL}/rsvp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), item_id: Number(itemId) })
    });
    if (res.ok) { setName(""); setItemId(""); await fetchAll(); alert("Confirmado! Obrigado 😊"); }
    else { const data = await res.json().catch(() => ({})); alert(data.detail || "Erro ao enviar."); }
  }
  async function handleDeleteGuestPublic(id) {
    if (!confirm("Remover esta confirmação?")) return;
    const res = await fetch(`${API_URL}/rsvp/${id}`, { method: "DELETE" });
    if (res.status === 204) await fetchAll();
  }

  // ── Admin: itens ────────────────────────────────────────
  function startEditItem(it) {
    setEditItem(p => ({ ...p, [it.id]: { name: it.name, max_qty: it.max_qty ?? "", note: it.note ?? "", dirty:false, saving:false }}));
  }
  function onChangeItem(id, field, value) {
    setEditItem(p => ({ ...p, [id]: { ...p[id], [field]: value, dirty:true }}));
  }
  async function saveItem(id) {
    const data = editItem[id]; if (!data) return;
    const payload = {
      name: data.name.trim(),
      max_qty: data.max_qty === "" ? null : Number(data.max_qty),
      note: data.note.trim() || null,
    };
    if (!payload.name) return alert("Nome não pode ficar vazio.");
    if (payload.max_qty !== null && (isNaN(payload.max_qty) || payload.max_qty < 0)) return alert("Quantidade máxima inválida.");
    setEditItem(p => ({ ...p, [id]: { ...p[id], saving:true }}));
    const res = await fetch(`${API_URL}/items/${id}`, { method:"PUT", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(payload) });
    if (res.ok) await fetchAll();
    else {
      const j = await res.json().catch(() => ({}));
      alert(j.detail || "Erro ao salvar item.");
      setEditItem(p => ({ ...p, [id]: { ...p[id], saving:false }}));
    }
  }
  async function deleteItem(id) {
    if (!confirm("Excluir este item? Isso também remove as confirmações associadas.")) return;
    const res = await fetch(`${API_URL}/items/${id}`, { method:"DELETE" });
    if (res.status === 204) await fetchAll();
    else { const j = await res.json().catch(() => ({})); alert(j.detail || "Erro ao excluir item."); }
  }
  async function handleAddItem(e) {
    e.preventDefault();
    const payload = {
      name: newItemName.trim(),
      max_qty: newItemMax === "" ? null : Number(newItemMax),
      note: newItemNote.trim() || null,
    };
    if (!payload.name) return alert("Informe o nome do item.");
    if (payload.max_qty !== null && (isNaN(payload.max_qty) || payload.max_qty < 0)) return alert("Quantidade máxima inválida.");
    const res = await fetch(`${API_URL}/items`, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(payload) });
    if (res.ok) { setNewItemName(""); setNewItemMax(""); setNewItemNote(""); setAddItemOpen(false); await fetchAll(); }
    else { const data = await res.json().catch(() => ({})); alert(data.detail || "Erro ao cadastrar item."); }
  }

  // ── Admin: convidados ───────────────────────────────────
  function startEditGuest(g) {
    setGuestEdit(p => ({ ...p, [g.id]: { item_id: g.item_id, dirty:false, saving:false }}));
  }
  function onChangeGuestItem(guestId, itemId) {
    setGuestEdit(p => ({ ...p, [guestId]: { ...p[guestId], item_id: Number(itemId), dirty:true }}));
  }
  async function saveGuestChange(g) {
    const st = guestEdit[g.id]; if (!st) return;
    const payload = { name: g.name, item_id: Number(st.item_id) }; // POST /rsvp atualiza por nome
    setGuestEdit(p => ({ ...p, [g.id]: { ...p[g.id], saving:true }}));
    const res = await fetch(`${API_URL}/rsvp`, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(payload) });
    if (res.ok) await fetchAll();
    else {
      const j = await res.json().catch(() => ({}));
      alert(j.detail || "Não foi possível trocar o item (pode estar esgotado).");
      setGuestEdit(p => ({ ...p, [g.id]: { ...p[g.id], saving:false }}));
    }
  }
  async function deleteGuestAdmin(id) {
    if (!confirm("Excluir este convidado?")) return;
    const res = await fetch(`${API_URL}/rsvp/${id}`, { method:"DELETE" });
    if (res.status === 204) await fetchAll();
    else {
      const j = await res.json().catch(() => ({}));
      alert(j.detail || "Erro ao excluir convidado.");
    }
  }

  const filteredGuests = useMemo(() => {
    const q = guestFilter.trim().toLowerCase();
    if (!q) return guests;
    return guests.filter(g => g.name.toLowerCase().includes(q));
  }, [guestFilter, guests]);

  // helper para desabilitar opções esgotadas (exceto a atual)
  function isOptionDisabled(it, currentItemId) {
    return it.max_qty != null && it.available === 0 && it.id !== currentItemId;
  }

  // ── UI ──────────────────────────────────────────────────
  return (
    <>
      {/* Engrenagem */}
      <button
        className={`gearBtn ${isAdmin ? "gearUnlocked" : ""}`}
        aria-label="Configurações"
        onClick={handleGearClick}
        title={isAdmin ? "Configurações" : "Desbloquear"}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M19.14,12.94a7.4,7.4,0,0,0,.05-1l1.71-1.33a.5.5,0,0,0,.12-.65l-1.62-2.8a.5.5,0,0,0-.6-.22l-2,.81a7.22,7.22,0,0,0-.86-.5l-.3-2.12a.5.5,0,0,0-.49-.42H9.85a.5.5,0,0,0-.49.42L9.06,6.25a7.22,7.22,0,0,0-.86.5l-2-.81a.5.5,0,0,0-.6.22L3.98,8.96a.5.5,0,0,0,.12.65L5.81,10.94a7.4,7.4,0,0,0,0,1L4.1,13.31a.5.5,0,0,0-.12.65l1.62,2.8a.5.5,0,0,0,.6.22l2-.81c.3.19.56.36.86.5l.3,2.12a.5.5,0,0,0,.49.42h3.62a.5.5,0,0,0,.49-.42l.3-2.12c.3-.14.58-.31.86-.5l2,.81a.5.5,0,0,0,.6-.22l1.62-2.8a.5.5,0,0,0-.12-.65ZM12,15.5A3.5,3.5,0,1,1,15.5,12,3.5,3.5,0,0,1,12,15.5Z"/>
        </svg>
      </button>

      {/* Menu */}
      {isAdmin && menuOpen && (
        <>
          <div className="backdrop" onClick={() => setMenuOpen(false)} />
          <div className="menu" onClick={e => e.stopPropagation()}>
            <div className="menuItem" onClick={() => { setMenuOpen(false); setAdminItemsOpen(true); }}>
              <span>🛒</span> <span>Administrar itens</span>
            </div>
            <div className="menuItem" onClick={() => { setMenuOpen(false); setAdminGuestsOpen(true); }}>
              <span>👤</span> <span>Administrar convidados</span>
            </div>
            <div className="menuItem" onClick={() => { setMenuOpen(false); setAddItemOpen(true); }}>
              <span>➕</span> <span>Cadastrar itens</span>
            </div>
          </div>
        </>
      )}

      {/* Modal: senha */}
      {pwdOpen && (
        <div className="modal" onClick={() => setPwdOpen(false)}>
          <div className="modalCard" onClick={e => e.stopPropagation()}>
            <div className="modalHeader">
              <h3 style={{ margin: 0 }}>Desbloquear admin</h3>
              <button className="btn btn-ghost" onClick={() => setPwdOpen(false)}>Fechar</button>
            </div>
            <form className="form" onSubmit={submitPassword}>
              <input ref={pwdInputRef} className="input" type="password"
                     placeholder="Senha" value={pwd}
                     onChange={e => { setPwd(e.target.value); setPwdErr(""); }} required />
              {pwdErr && <div style={{ color: "var(--danger)", fontSize: ".92rem" }}>{pwdErr}</div>}
              <div className="modalActions">
                <button type="button" className="btn btn-ghost" onClick={() => setPwdOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Desbloquear</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: cadastrar item */}
      {addItemOpen && (
        <div className="modal" onClick={() => setAddItemOpen(false)}>
          <div className="modalCard" onClick={e => e.stopPropagation()}>
            <div className="modalHeader">
              <h3 style={{ margin: 0 }}>Cadastrar item</h3>
              <button className="btn btn-ghost" onClick={() => setAddItemOpen(false)}>Fechar</button>
            </div>
            <p className="muted">Deixe a quantidade em branco para “ilimitado”.</p>
            <form className="form" onSubmit={handleAddItem}>
              <input className="input" placeholder="Nome do item"
                     value={newItemName} onChange={e => setNewItemName(e.target.value)}
                     maxLength={120} required />
              <input className="input" type="number" min="0"
                     placeholder="Quantidade máxima (opcional)"
                     value={newItemMax} onChange={e => setNewItemMax(e.target.value)} />
              <input className="input" placeholder="Observação (opcional)"
                     value={newItemNote} onChange={e => setNewItemNote(e.target.value)} />
              <div className="modalActions">
                <button type="button" className="btn btn-ghost" onClick={() => setAddItemOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: administrar itens */}
      {adminItemsOpen && (
        <div className="modal" onClick={() => setAdminItemsOpen(false)}>
          <div className="modalCard" onClick={e => e.stopPropagation()}>
            <div className="modalHeader">
              <h3 style={{ margin: 0 }}>Administrar itens</h3>
              <button className="btn btn-ghost" onClick={() => setAdminItemsOpen(false)}>Fechar</button>
            </div>

            <div className="muted" style={{ marginBottom: 8 }}>
              Edite os campos e clique <b>Salvar</b>. Para ilimitado, deixe a quantidade em branco.
            </div>

            <div style={{ display: "grid", gap: 10, maxHeight: "60vh", overflow: "auto" }}>
              {items.map(it => {
                const st = editItem[it.id] ?? {};
                const isEditing = !!editItem[it.id];
                return (
                  <div key={it.id} style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 10 }}>
                    <div className="adminRow">
                      <input className="input"
                        value={isEditing ? st.name : it.name}
                        onChange={e => onChangeItem(it.id, "name", e.target.value)}
                        onFocus={() => !isEditing && startEditItem(it)} placeholder="Nome"
                      />
                      <input className="input" type="number" min="0"
                        value={isEditing ? st.max_qty : (it.max_qty ?? "")}
                        onChange={e => onChangeItem(it.id, "max_qty", e.target.value)}
                        onFocus={() => !isEditing && startEditItem(it)} placeholder="Qtde máx (opcional)"
                      />
                      <input className="input"
                        value={isEditing ? st.note : (it.note ?? "")}
                        onChange={e => onChangeItem(it.id, "note", e.target.value)}
                        onFocus={() => !isEditing && startEditItem(it)} placeholder="Observação (opcional)"
                      />
                      <div className="adminActions">
                        <button className="btn btn-primary" onClick={() => saveItem(it.id)} disabled={!st.dirty || st.saving}>
                          {st.saving ? "Salvando..." : "Salvar"}
                        </button>
                        <button className="btn btn-danger" onClick={() => deleteItem(it.id)}>Excluir</button>
                      </div>
                    </div>
                    <div className="muted" style={{ marginTop: 6 }}>
                      <span className="badge">Reservados: {it.reserved_count}</span>
                      {it.max_qty != null && <span style={{ marginLeft: 8 }} className="badge">Disponíveis: {it.available}</span>}
                      {it.note && <span style={{ marginLeft: 8 }} className="badge">Obs: {it.note}</span>}
                    </div>
                  </div>
                );
              })}
              {items.length === 0 && <div className="muted">Nenhum item cadastrado.</div>}
            </div>
          </div>
        </div>
      )}

      {/* Modal: administrar convidados */}
      {adminGuestsOpen && (
        <div className="modal" onClick={() => setAdminGuestsOpen(false)}>
          <div className="modalCard" onClick={e => e.stopPropagation()}>
            <div className="modalHeader">
              <h3 style={{ margin: 0 }}>Administrar convidados</h3>
              <button className="btn btn-ghost" onClick={() => setAdminGuestsOpen(false)}>Fechar</button>
            </div>

            <input
              className="input search"
              placeholder="Filtrar por nome..."
              value={guestFilter}
              onChange={e => setGuestFilter(e.target.value)}
            />

            <div style={{ display: "grid", gap: 10, maxHeight: "60vh", overflow: "auto" }}>
              {filteredGuests.map(g => {
                const st = guestEdit[g.id] ?? { item_id: g.item_id, dirty:false, saving:false };
                const currentItemId = g.item_id;

                return (
                  <div key={g.id} style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 10 }}>
                    <div className="guestRow">
                      <input className="input" value={g.name} readOnly />
                      <select
                        className="select"
                        value={st.item_id}
                        onChange={(e) => onChangeGuestItem(g.id, e.target.value)}
                        onFocus={() => !guestEdit[g.id] && startEditGuest(g)}
                      >
                        {items.map(it => (
                          <option key={it.id} value={it.id} disabled={isOptionDisabled(it, currentItemId)}>
                            {it.name}{it.note ? ` — ${it.note}` : ""} {it.max_qty == null ? "" : ` (faltam ${it.available})`}
                          </option>
                        ))}
                      </select>

                      <div className="guestActions">
                        <button className="btn btn-primary" disabled={!st.dirty || st.saving}
                                onClick={() => saveGuestChange(g)}>
                          {st.saving ? "Salvando..." : "Trocar item"}
                        </button>
                        <button className="btn btn-danger" onClick={() => deleteGuestAdmin(g.id)}>Excluir</button>
                      </div>
                    </div>

                    <div className="muted" style={{ marginTop: 6 }}>
                      <span className="badge">Atual: {g.item_name}</span>
                      <span style={{ marginLeft: 8 }} className="badge">
                        Confirmado em: {new Date(g.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })}
              {filteredGuests.length === 0 && <div className="muted">Nenhum convidado encontrado.</div>}
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo principal */}
      <div className="container">
        <h1 style={{ textAlign: "center" }}>Chá de Casa Nova de YURI 🎉</h1>
        <p style={{ textAlign: "center" }}>Digite seu nome e escolha um item para levar:</p>

        <form className="form" onSubmit={handleSubmit}>
          <input className="input" placeholder="Seu nome"
                 value={name} onChange={e => setName(e.target.value)} required maxLength={120} />
          <select className="select" value={itemId} onChange={e => setItemId(e.target.value)} required>
            <option value="" disabled>Selecione um item</option>
            {items.map(it => {
              const label = it.max_qty == null
                ? `${it.name}${it.note ? ` — ${it.note}` : ""} (${it.reserved_count})`
                : `${it.name}${it.note ? ` — ${it.note}` : ""} — faltam ${it.available}`;
              const disabled = it.max_qty != null && it.available === 0;
              return (
                <option key={it.id} value={it.id} disabled={disabled}>{label}</option>
              );
            })}
          </select>
          <button className="btn btn-primary" type="submit">Confirmar</button>
        </form>

        <h2>Quem vai levar o quê</h2>
        <ul id="guest-list" className="list">
          {guests.map(g => (
            <li key={g.id} className="listItem">
              <span style={{ fontWeight: 600 }}>{g.name}</span>
              <span className="muted">→ {g.item_name}</span>
              {isAdmin && (
                <button className="btn btn-ghost" style={{ marginLeft: "auto", padding: "6px 10px" }}
                        onClick={() => handleDeleteGuestPublic(g.id)}>
                  Remover
                </button>
              )}
            </li>
          ))}
          {guests.length === 0 && <li>Ninguém confirmou ainda.</li>}
        </ul>
      </div>
    </>
  );
}
