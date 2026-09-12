# Kangaroo Crossing — prompt log

## Tools and scope

- Platform: Kiro, as confirmed by Tony Liu.
- Model: GPT-6, as identified by Tony Liu.
- This recorded conversation used the Codex assistant and coding tools for implementation, checks, and GitHub publication.
- The numbered blocks below reproduce the user’s task prompts from the available conversation verbatim, preserving wording, typos, and language. They are not AI-written summaries. Environment metadata and automatically supplied plugin lists are excluded.
- The conversation does not identify which prompts belong to the timed in-class sprint. Any additional Kiro prompts outside this conversation are not available here and should be appended from their original history if applicable.

## 1

```text
I am trying to do a replication of the Crossay Road Game, tell me what I need to build this game, what we need to plan first or structured
```

## 2

```text
lets start with an interactive html version of the game?
```

## 3

```text
nope I can't access it, can you show the demo in the chat
```

## 4

```text
Great, the basic bone of the game is set up! However, a few changes that could be made:

1. Player now can just stand there and wait without any penalty, let add a rolling screen feature that make palyer has to keep going forward or else will die and end the game
2. Instead of a chicken character, I want a fish instead, where the fish need to continue to jump mimicking the action a fish will do if it get on the land
```

## 5

```text
1. change the fish to kangaroo
2. make the car on the raod into different type of car, longer car turn into bus, normal car keep as current, and we can also have policy car, ambulance, etc
3. make some corssing into a lake, where character need to jump on floating log or leaf to get across
```

## 6

```text
1. 袋鼠的视角需要从侧视图变换为从正后方的俯视图，同时袋鼠的跳跃动作需要更加自然，加上一些动画，袋鼠往后跳的时候应该可以转身
2. 整体的美术风格现在变得更加扁平化了，我还希望是3D美术的视觉效果，参考这个网站：[https://crossyroadgame.io/](https://crossyroadgame.io/)
3. 我希望在开头和结尾加上标题划入划出的动画，同样参考上面的网站
```

## 7

```text
Great！ much better

1. 加一个袋鼠被撞到后飞出屏幕的动画，然后再闪入标题
2. 袋鼠如果在池塘里死亡，加一个袋鼠落入水中水花溅起的动画
```

## 8

```text
great，now you create some chill background music and sound effects for jumping, clahsing, drowning,etc and add it into the game?
```

## 9

```text
Great, now can you push this to my github and make it live on site? how can you do it, I want it to showcase on my portfolio: [https://toooonyliu.github.io/index.html](https://toooonyliu.github.io/index.html)
```

## 10

```text
[https://www.cs.cmu.edu/\~113/hw2.html](https://www.cs.cmu.edu/~113/hw2.html) (can you check this website about this assignment detail and tell me what we have not done yet?)
```

## 11

```text
great, can you do the following things then

1. can you add in the README, change the description to: A Crossy Road-inspired browser game by Tony Liu, use Kiro as a platform and GPT-6 to co-developed.
2. Generate our prompt\_log and add it into the folder on github
3. We did use Kiro, what you mean? Anything else I am missing here?
```
