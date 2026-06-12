# Arcadas Arcanas — Largo São Francisco Legacy

Um jogo 3D de ação e exploração em terceira pessoa, feito com **Three.js**, ambientado em uma
versão mágica da Faculdade de Direito do Largo de São Francisco (São Paulo). Conteúdo 100%
original: a magia aqui é **jurídica**, com feitiços em latim forense.

## História

Sob as arcadas da velha Academia, fundada em 1827, funciona uma escola secreta de magia
jurídica. Na véspera da sua prova oral, os **Autos Malditos** — processos esquecidos que
ganharam vida nos porões — escaparam para o pátio. Cabe a você, calouro(a) das Arcadas:

- 📜 Recolher as **11 Folhas do Códice** espalhadas pelo pátio, pelo Largo e perto da igreja;
- ⚖️ **Arquivar os 8 Autos Malditos** usando seus feitiços.

## Feitiços

| Tecla | Feitiço | Efeito | Mana |
|-------|---------------|---------------------------------------|------|
| 1 | *Lumen Iuris* | Projétil de luz (dano) | 10 |
| 2 | *Data Venia* | Onda de impacto com empurrão | 25 |
| 3 | *Habeas Corpus* | Escudo protetor por 5s (repele autos) | 40 |

Mana regenera com o tempo. Vida regenera perto do **chafariz do Largo**.

## Controles

- **WASD** — mover · **Mouse** — câmera · **Shift** — correr · **Espaço** — pular
- **Clique esquerdo** — lançar feitiço · **1/2/3** — trocar feitiço
- **E** — conversar com estudantes · **Esc** — pausar (solta o mouse)

## Como rodar

Não há build nem dependências: é HTML + ES modules, com o Three.js vendorizado em
`vendor/` (funciona offline). Basta servir a pasta com qualquer servidor estático:

```bash
# opção 1
python3 -m http.server 8000

# opção 2
npx serve .
```

E abrir <http://localhost:8000> no navegador.

## Arquitetura

| Arquivo | Responsabilidade |
|------------------|------------------------------------------------------------------|
| `index.html` | HUD em HTML/CSS, tela inicial e import map do Three.js |
| `src/main.js` | Cena, ciclo dia/noite, loop do jogo, input e estado geral |
| `src/world.js` | Geometria procedural: Pátio das Arcadas, Largo, igreja, colisões |
| `src/player.js` | Personagem (beca de estudante), câmera em 3ª pessoa, física |
| `src/spells.js` | Feitiços, projéteis, partículas e som sintetizado (WebAudio) |
| `src/entities.js`| Autos Malditos (IA simples), Folhas do Códice, estudantes NPC |
| `src/hud.js` | Atualização da interface |
| `vendor/` | Three.js r160 (módulo ES vendorizado) |

Para testes e capturas de tela há um modo debug por parâmetros de URL:
`?auto` inicia sem pointer lock, `&hora=0..1` fixa a fração do dia (0.25 = meio-dia,
0.65 = noite) e `&x= &z= &yaw= &pitch=` posicionam o jogador e a câmera.

Todo o cenário é gerado por código (sem assets externos): arcadas com arcos extrudados,
chafariz, monumento, jacarandás em flor, postes que acendem à noite, céu com estrelas e
prédios do centro de São Paulo ao fundo.
