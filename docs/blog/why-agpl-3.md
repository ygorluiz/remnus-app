Open source licensing is one of those decisions that looks simple from the outside — "just pick MIT and move on" — but actually carries real strategic weight for a product-led company. We spent a few weeks on this before committing. Here is what we considered and why we landed on AGPL-3.0.

## The Problem with MIT for Infrastructure Software

MIT is the right choice for a lot of software. Libraries, CLI tools, developer utilities — things where adoption is the goal and you want zero friction. But for a self-hostable web application that competes with SaaS products, MIT creates a structural problem: a cloud provider or enterprise can take your entire codebase, wrap it in managed infrastructure, and sell it commercially without contributing anything back or even telling you they did it.

This is not hypothetical. It happened repeatedly in the early 2010s with databases and messaging systems. Companies that built genuinely useful open source infrastructure watched hyperscalers absorb their work, out-market them with integrations and enterprise support, and hollow out the contributor base in the process.

For a workspace tool like Remnus, the same dynamic applies. If we published under MIT, a motivated competitor could fork the repo today, rebrand it, and launch a competing SaaS by next month — without contributing a single bug fix or translation. We are a small team. We cannot win a resource war against a well-funded fork.

## Why Not BSL or SSPL?

Business Source License (BSL) and Server Side Public License (SSPL) are understandable responses to this problem, but they carry their own costs.

**BSL** (used by MariaDB, CockroachDB, HashiCorp before they went proprietary) is essentially "open source in 4 years." The code eventually becomes open, but the present version is not freely usable for commercial purposes. Contributors face an uncomfortable question: am I donating my work to a license that restricts how others can use it? Contribution rates tend to reflect that ambiguity.

**SSPL** (MongoDB's invention, now also used by Elastic for some products) takes a more aggressive stance: if you offer the software as a service, you must also open source *all the software used to offer that service* — your orchestration, your monitoring stack, your internal tooling. The OSI does not recognize SSPL as an open source license, and for good reason. It is designed to be practically unusable for cloud providers, which is the point, but it also signals to the broader community that you are not actually committed to open source.

Neither felt right. We wanted a license that the OSI recognizes as genuine open source, that allows anyone to self-host freely, but that closes the SaaS loophole.

## What AGPL Does Differently

The GNU Affero General Public License (AGPL-3.0) is a copyleft license with one important addition to GPL: the **network use provision**. Under GPL, you can run modified software on a server without publishing your changes, because the user never receives a copy of the binary. AGPL closes that gap — if you make your modified version accessible over a network (i.e., run it as a service), you must make your source available under the same terms.

For Remnus this means:

- **Anyone can self-host** the official codebase for free, personal or commercial use.
- **Anyone can modify** and self-host their modified version, as long as they publish those modifications under AGPL.
- **No one can run a proprietary SaaS** based on a modified fork without releasing their changes.

This is exactly the model Plausible Analytics adopted in 2021. Before AGPL, Plausible was growing slowly. After making the switch and making the licensing case publicly, they saw their GitHub stars jump from roughly 500 to over 4,300 in a matter of months. The AGPL signal told the open source community: this project is for real, the authors are committed, forks will not be able to poach you silently. It built trust.

Cal.com, AppFlowy, and Docmost use the same approach. They are all legitimate open source projects with healthy contributor communities — and they all protect their SaaS model through copyleft rather than through source-available workarounds.

## What We Are Not Doing

A few clarifications on scope:

**No per-file license headers.** The root `LICENSE` file is sufficient. Requiring headers on every file adds maintenance overhead and deters contributions without adding legal protection. The license applies to the repository.

**No Contributor License Agreement (CLA) right now.** CLAs let companies relicense contributed code later (e.g., to move to a proprietary license). We have no current plan to do that, and requiring a CLA before accepting a pull request creates unnecessary friction for first-time contributors. We may revisit this if the project scales to a point where it becomes relevant.

**AGPL does not apply to things you build *with* Remnus.** If you use Remnus as a tool to run your business — write documents, manage databases, store notes — that is not a derivative work. AGPL only affects people who distribute or host *Remnus itself* in modified form.

## The Bottom Line

We want Remnus to be genuinely open. Not open-as-a-marketing-claim, not source-available with commercial restrictions wrapped in careful language. Real open source, OSI-certified, forkable, self-hostable.

AGPL lets us do that while also protecting the thing that makes it possible to keep working on the project: the ability to run `remnus.com` as a sustainable product. The license says: if you improve Remnus and offer it to others, share those improvements. That seems fair.

If you have questions about what the license means for your specific use case, [open an issue](https://github.com/Ranork/remnus-app/issues) or reach out directly. We would rather answer the question than have you guess.
