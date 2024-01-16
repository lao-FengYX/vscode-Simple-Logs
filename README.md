# Simple Logs README

[English](README.en.md)

这个插件是用来显示 git 行内记录的

如果文件是新增的, 不会被追踪到, 文件没有提交也不会存储在 `vscode` 的全局中, 下次打开依旧是最近修改

**config**

* 可以自定义字体颜色
* 可以自定义背景颜色
* 可以自定义忽略的路径
* 可以设置是否使用当地习惯用语
* 可以设置显示内容

**Custom Message**

| 自定义支持的内容 | 限制的长度 | 描述            |
| -------------- | ---------- | -------------- |
| hash           | 40         | 提交的哈希值    |
| s-hash         | 7          | 提交的哈希值(短) |
| author         | -          | 作者名字        |
| author-mail    | -          | 作者邮箱        |
| author-time    | -          | 作者提交时间     |
| author-tz      | -          | 作者提交的时区   |
| committer      | -          | 提交者的名字     |
| committer-mail | -          | 提交者的邮箱     |
| committer-time | -          | 提交者提交的时间 |
| committer-tz   | -          | 提交者的时区     |
| summary        | -          | 提交的信息       |

时间不支持设置长度

**Example**

默认

`${committer}, ${committer-time} • ${summary}`

限制显示长度为 10

`${summary | 10}`

**References**

此插件参考了 [Git Blame](https://marketplace.visualstudio.com/items?itemName=waderyan.gitblame) , 如果可以的话, 请支持它

**Enjoy!**
