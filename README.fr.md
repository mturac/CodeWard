<p align="center">
  <img src="docs/assets/codeward-hero.png" alt="CodeWard repo guardrail pipeline" width="100%">
</p>

# CodeWard

**Des garde-fous open source pour l'ingénierie assistée par IA.**

CodeWard transforme n'importe quel dépôt en espace de travail prêt pour les agents de code et plus sûr pour la production. Il analyse le code, génère des fichiers d'instructions propres au dépôt comme `AGENTS.md` et `.github/copilot-instructions.md`, puis vérifie les pull requests avant que du code généré par IA n'approche la production.

**Langues :** [English](README.md) | [中文](README.zh-CN.md) | Français | [Türkçe](README.tr.md)

## Pourquoi CodeWard

Les agents de code IA sont rapides. Les codebases de production ont toujours besoin de discipline.

CodeWard aide les équipes à définir et appliquer :

- des instructions spécifiques au dépôt
- des limites d'architecture et de propriété
- des commandes de validation
- des politiques pour les chemins à risque
- des contrôles sensibles à la sécurité
- des garde-fous pour les pull requests
- des task packs à partir d'issues
- des règles déterministes configurables

CodeWard ne remplace pas Cursor, Claude Code, Codex, Copilot ou les autres agents de code. Il leur donne de meilleurs rails.

## Fonctionnement

```txt
analyze repo -> generate instruction files -> enforce policy -> produce PR risk report
```

CodeWard v0.1 fonctionne sans LLM ni clé API.

| Capacité | Résultat |
| --- | --- |
| Scan du dépôt | Frameworks, gestionnaire de paquets, scripts, variables d'environnement, chemins à risque, routes et tests |
| Fichiers d'instructions | `AGENTS.md` et `.github/copilot-instructions.md` adaptés au dépôt |
| Contrôles déterministes | Instructions manquantes, dérive `.env.example`, dépendances, chemins à risque, tests manquants, `any`, `catch` silencieux |
| GitHub Action | Annotations de PR et politique fail-on-error |
| Task packs | Transformation d'une issue en brief prêt pour un agent |

## Démarrage rapide

```bash
pnpm install
pnpm build
pnpm check
```

Ouvrir l'interface produit Vite :

```bash
pnpm dev:web
```

Essayer avec le dépôt exemple :

```bash
pnpm codeward init --root examples/next-prisma-saas
pnpm codeward scan --root examples/next-prisma-saas
pnpm codeward check --root examples/next-prisma-saas --no-fail
```

Exécuter CodeWard sur un autre dépôt local depuis ce checkout :

```bash
pnpm codeward init --root /path/to/repo
pnpm codeward scan --root /path/to/repo
pnpm codeward agents --root /path/to/repo --target agents,copilot --write
pnpm codeward check --root /path/to/repo
```

## CLI

```txt
codeward init      Crée les fichiers d'instructions, .codeward/config.yml, repo-map et CI
codeward scan      Affiche le contexte du dépôt en format machine-readable
codeward agents    Génère AGENTS.md et les instructions Copilot
codeward check     Lance les contrôles déterministes de production
codeward ci        Produit une sortie compatible GitHub
codeward task      Convertit une issue en task pack prêt pour agent
```

## Développement

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check
```

## Licence

Apache-2.0.
