# NPM 发布流程

本文档记录 `@yanivjs/yaniv-editor` 发布到 npm 的标准流程。

## 1. 发布前确认

确认当前工作区没有未预期的改动：

```sh
git status --short --branch
```

确认当前包名和版本：

```sh
node -p "require('./package.json').name + '@' + require('./package.json').version"
```

确认官方 npm registry 上已发布的版本：

```sh
npm view @yanivjs/yaniv-editor dist-tags versions --json --registry https://registry.npmjs.org
```

如果 `package.json` 里的版本已经存在，需要先升级版本号，例如：

```sh
pnpm version patch
```

也可以按需要使用 `minor` 或 `major`：

```sh
pnpm version minor
pnpm version major
```

## 2. 登录 npm

发布前需要登录官方 npm registry：

```sh
npm login --registry https://registry.npmjs.org
```

确认登录状态：

```sh
npm whoami --registry https://registry.npmjs.org
```

## 3. 本地验证

优先跑完整验证：

```sh
pnpm run verify
```

如果 `verify` 因旧的构建产物、文档站产物或缓存目录报 lint 错误，先确认这些目录是否应被清理或忽略，再重新验证。

## 4. 发布预演

正式发布前先 dry-run，确认构建能通过、包内容正确：

```sh
pnpm publish --dry-run --registry https://registry.npmjs.org
```

重点检查输出中的内容：

- 包名和版本是否正确。
- `Tarball Contents` 是否只包含预期文件。
- 包体大小是否合理。
- 是否发布到 `https://registry.npmjs.org`。
- 是否为 `public access`。

当前 `package.json` 已配置：

```json
{
  "files": ["dist"],
  "publishConfig": {
    "access": "public"
  },
  "scripts": {
    "prepublishOnly": "pnpm build"
  }
}
```

因此发布时会自动执行 `pnpm build`，并只把 `dist` 作为主要产物打进 npm 包。

## 5. 正式发布

确认 dry-run 无误后执行：

```sh
pnpm publish --registry https://registry.npmjs.org --access public
```

发布成功后确认线上版本：

```sh
npm view @yanivjs/yaniv-editor version --registry https://registry.npmjs.org
npm view @yanivjs/yaniv-editor dist-tags --json --registry https://registry.npmjs.org
```

## 6. 常见问题

### 未登录

如果出现 `ENEEDAUTH`，说明当前机器未登录 npm：

```sh
npm login --registry https://registry.npmjs.org
```

### 版本已存在

如果 npm 上已经存在相同版本，不能重复发布。先升级 `package.json` 版本，再重新 dry-run 和发布：

```sh
pnpm version patch
pnpm publish --dry-run --registry https://registry.npmjs.org
pnpm publish --registry https://registry.npmjs.org --access public
```

### registry 不正确

如果本机默认 registry 是镜像源，例如 `https://registry.npmmirror.com/`，发布命令必须显式指定官方 registry：

```sh
pnpm publish --registry https://registry.npmjs.org --access public
```

也可以临时查看当前 registry：

```sh
npm config get registry
```
