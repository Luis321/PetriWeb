# HPetriSim Web 🕸️

**Simulador interactivo de Redes de Petri Estocásticas Generalizadas (GSPN)**  
Funciona 100 % en el navegador — sin servidor, sin instalación de software especializado.

[![Deploy to GitHub Pages](https://github.com/TU_USUARIO/hpetrisim/actions/workflows/deploy.yml/badge.svg)](https://github.com/TU_USUARIO/hpetrisim/actions/workflows/deploy.yml)

---

## ✨ Características

| Función | Detalle |
|---|---|
| **Editor visual** | Añade lugares, transiciones y arcos con clic |
| **Drag & Drop** | Mueve cualquier elemento arrastrándolo |
| **Pan & Zoom** | Rueda del ratón para zoom, arrastra el fondo para paneo |
| **Distribuciones** | Exp(λ), Normal(μ,σ), Uniforme(a,b), Constante, Erlang(k,λ) |
| **Trans. inmediatas** | Peso y prioridad para resolución de conflictos GSPN |
| **Estadísticas** | Tokens promedio por lugar, tasa de disparo, log de eventos |
| **Import / Export** | Guarda y carga redes en formato JSON |
| **Atajos de teclado** | S/P/T/A/D para modos, Del para borrar, Esc para cancelar |
| **Ejemplos built-in** | M/M/1, M/M/2, Museo, Ministerio |

---

## 🚀 Uso rápido (local)

```bash
git clone https://github.com/TU_USUARIO/hpetrisim.git
cd hpetrisim
npm install
npm run dev
# → http://localhost:5173
```

---

## 🌐 Deploy en GitHub Pages

### Opción A — Automático con GitHub Actions (recomendado)

1. Sube este repositorio a GitHub
2. Ve a **Settings → Pages**
3. En *Source* selecciona **GitHub Actions**
4. Haz un push a `main` — el workflow se dispara automáticamente
5. Tu app estará en `https://TU_USUARIO.github.io/hpetrisim/`

El workflow (`.github/workflows/deploy.yml`) lee el nombre del repo automáticamente
para configurar la ruta base correcta.

### Opción B — Manual (build + subir `dist/`)

```bash
# 1. Ajusta la base path si tu repo se llama diferente a 'hpetrisim'
#    Edita vite.config.js → base: '/TU_REPO/'

# 2. Build
npm run build

# 3. Sube la carpeta dist/ a la rama gh-pages
npx gh-pages -d dist
```

---

## 📐 Semántica GSPN

### Transiciones temporizadas vs. inmediatas

- **Temporizadas**: compiten entre sí (race condition). La primera en alcanzar su tiempo de disparo gana.
- **Inmediatas**: se disparan instantáneamente. En conflicto, gana la de mayor *prioridad*; entre igual prioridad se resuelve por *peso* (selección ponderada aleatoria).

### Modelado de colas M/M/c

```
[Fuente] →──Llegada (Exp)──→ [Cola]
                              [Servidores libres (c tok.)]
                              ↓ (ambos como entrada)
                           [Ini. servicio] (inmediata)
                              ↓
                         [En servicio]
                              ↓
                        [Fin servicio] (Exp)
                         ↗          ↘
             [Servidores libres]   [Salida]
```

El lugar *"Servidores libres"* con **c tokens iniciales** permite hasta c instancias en
paralelo de la transición *Fin servicio*, representando correctamente la concurrencia de c servidores.

---

## 🔑 Atajos de teclado

| Tecla | Acción |
|-------|--------|
| `S` | Modo selección / mover |
| `P` | Añadir lugar |
| `T` | Añadir transición |
| `A` | Añadir arco |
| `D` | Modo borrar |
| `Esc` | Cancelar / volver a selección |
| `Del` / `⌫` | Borrar elemento seleccionado |
| `Rueda` | Zoom in / out |

---

## 🗂️ Estructura del proyecto

```
hpetrisim/
├── index.html                  # Punto de entrada HTML
├── package.json
├── vite.config.js              # Config build + base path
├── .github/
│   └── workflows/
│       └── deploy.yml          # CI/CD → GitHub Pages
└── src/
    ├── main.jsx                # Entrada React
    ├── App.jsx                 # Componente principal (UI + lógica)
    ├── App.css                 # Estilos (dark mode)
    ├── engine.js               # Motor de simulación GSPN
    └── examples.js             # Redes de ejemplo incorporadas
```

---

## 🧮 Distribuciones disponibles

| Nombre | Parámetros | Media |
|--------|-----------|-------|
| Exp(λ) | Tasa λ > 0 | 1/λ |
| N(μ, σ) | Media μ, desv. estándar σ > 0 | μ |
| U(a, b) | Mínimo a, máximo b | (a+b)/2 |
| Cte(v) | Valor fijo v > 0 | v |
| Erl(k, λ) | k etapas, tasa λ | k/λ |

---

## 📄 Licencia

MIT — libre para uso académico y comercial.
