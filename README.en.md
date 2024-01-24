# Simple Logs README

[中文](README.md)

This plugin is used to display Git inline records

If the file is newly added, it will not be tracked, and if it is not submitted, it will not be stored in the global 'vscode'. The next time it is opened, it will still be the most recent modification

After installation, it may be necessary to restart

**config**

* Can customize font colors
* Customizable background color
* Can customize ignored paths
* Can be set to use local idioms
* Can set display content

**Custom Message**

| Customized Content | Length     | Description                    |
| ------------------ | ---------- | ------------------------------ |
| hash               | 40         | Hash value submitted           |
| s-hash             | 7          | Hash value submitted (short)   |
| author             | -          | Author's name                  |
| author-mail        | -          | Author's email                 |
| author-time        | -          | Author's submission time       |
| author-tz          | -          | Author's  time zone            |
| committer          | -          | Committer's name               |
| committer-mail     | -          | Committer's email              |
| committer-time     | -          | Committer's submission time    |
| committer-tz       | -          | Committer's time zone          |
| summary            | -          | Submitted information          |

Time does not support setting length

**Example**

Default

`${committer}, ${committer-time} • ${summary}`

Limit display length to 10

`${summary | 10}`

**References**

This plugin references [Git Blame](https://marketplace.visualstudio.com/items?itemName=waderyan.gitblame) , If possible, please support it

**Enjoy!**
