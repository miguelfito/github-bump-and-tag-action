module.exports = {
    hooks: {
        "prepare-commit-msg": "npx --no-install devmoji -e --lint HUSKY_GIT_PARAMS",
    }
};
