# Port de dev propre à l'arbre de travail, partagé par `bun dev` et cahiers-verify :
# 3000 pour le checkout principal, 3100-3899 dérivé du chemin pour un worktree.
dev_port() {
  if [ -d "$1/.git" ]; then echo 3000; return; fi
  echo $(( 3100 + $(printf %s "$1" | cksum | cut -d' ' -f1) % 800 ))
}
