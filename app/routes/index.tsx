import { data } from "react-router";
import type { Route } from "./+types/index";
import { siteForRequest } from "~/sites";
import { getRepos, type Repo } from "~/lib/github.server";
import { Terminal } from "~/sites/terminal/Terminal";
import { StartPage } from "~/sites/start/StartPage";

const cacheHeaders = {
  "Cache-Control": "public, max-age=600, s-maxage=3600, stale-while-revalidate=60",
};

export async function loader({ request }: Route.LoaderArgs) {
  const site = siteForRequest(request);

  switch (site) {
    case "terminal":
      return data({ site, repos: await getRepos() }, { headers: cacheHeaders });
    case "start":
      return data({ site, repos: [] as Repo[] }, { headers: cacheHeaders });
    case "banners":
      // banners.eptic.ro only serves images, its root is a 404.
      throw new Response(null, { status: 404, statusText: "Not Found" });
  }
}

export function headers({ loaderHeaders }: Route.HeadersArgs) {
  return loaderHeaders;
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (loaderData?.site === "start") {
    return [{ title: "EPTIC - Start Page" }];
  }
  return [
    { title: "EPTIC Solutions" },
    {
      name: "description",
      content: "EPTIC Solutions is a romanian based software agency.",
    },
  ];
}

export default function Index({ loaderData }: Route.ComponentProps) {
  return loaderData.site === "start" ? <StartPage /> : <Terminal repos={loaderData.repos} />;
}
