# Athena, formerly Moments

A simple, fast, and very opinionated library of moments. Essentially acting as a personal mini-blog application, Athena focuses on capturing bite-sized and extensively filterable momnets.

## What's a Moment?

A moment is like a post. It consists of three parts:

- **Title**: A short summary of the body.
- **Content**: A description of the moment. Could be anything! It's basically a message.
- **Tags**: This is where Athena shines. Tags are easily accessible and filterable, so use them!

Athena is all about a library of **archives**, which in turn are **libraries of moments**. For example, there may be a school archive, and inside the school archive is a few moments regarding Physics, Math, Science, and any other school related moment. Each moment has their own relevant tags.

## Core Features

- **Quick-access to Everything:** In Athena, the goal is to maintain a minimal UI, optimizing for the minimal amount of actions taken in order to do something.
- **Smart tags**: The tag bar is one of fastest ways to find what you are looking for. The tag list dynamically updates based on the current selection of tags, meaning that only tags that will actually yield displayed moments will show. Thus preventing experiences where pressing a tag will yield "No results found."
- **Link Previewing**: Whenever a link is detected in the content body, it will be displayed in a special format that uses scraped data to display it in a visually appealing way.

## Tech Stack

Athena is built using SolidJS and TailwindCSS with typescript for the frontend, vite for tooling, and electron forge for packaing and creating distributables.

## Locally Stored Data

Athena does not store data to any cloud services, and all data is stored locally, which backups being up to the user. Saving to the cloud will be added in future versions, and will be opt-in.
