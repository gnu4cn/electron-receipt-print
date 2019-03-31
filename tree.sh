function tree-git-ignore {
    # tree respecting gitignore

    local ignored=$(git ls-files -ci --others --directory --exclude-standard)
    local ignored_filter=$(echo "$ignored" \
        | egrep -v "^#.*$|^[[:space:]]*$" \
        | sed 's~^/~~' \
        | sed 's~/$~~' \
        | tr "\\n" "|")
    tree --prune -I ".git|${ignored_filter: : -1}" "$@"
}

tree-git-ignore
