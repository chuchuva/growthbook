import * as React from "react";
import { AppProps } from "next/app";
import Head from "next/head";
import Link from "next/link";
import "tailwindcss/tailwind.css";
import { useEffect } from "react";
import {
  FaMoon,
  FaSun,
  FaChevronLeft,
  FaChevronRight,
  FaGithub,
  FaSlack,
} from "react-icons/fa";
import DocsLink from "../components/DocsLink";

const navLinks = [
  {
    href: "/",
    name: "Docs Home",
  },
  {
    href: "/overview",
    name: "How it works",
  },
  {
    href: "/self-host",
    name: "Self-Host",
    links: [
      {
        href: "/self-host/config",
        name: "Configuration",
      },
    ],
  },
  {
    href: "/app",
    name: "Platform",
    links: [
      {
        href: "/app/datasources",
        name: "Data Sources",
      },
      {
        href: "/app/metrics",
        name: "Metrics",
      },
      {
        href: "/app/features",
        name: "Features",
      },
      {
        href: "/app/experiments",
        name: "Experiments",
      },
      {
        href: "/app/dimensions",
        name: "Dimensions",
      },
      {
        href: "/app/visual",
        name: "Visual Editor",
        beta: true,
      },
      {
        href: "/app/webhooks",
        name: "Webhooks",
      },
    ],
  },
  {
    href: "/guide",
    name: "How to",
    links: [
      {
        href: "/guide/nextjs-and-growthbook",
        name: "Next.js",
      },
      {
        href: "/guide/create-react-app-and-growthbook",
        name: "Create React App",
      },
      {
        href: "/guide/GA-universal-analytics",
        name: "Google Analytics - UA",
      },
      {
        href: "/guide/mixpanel",
        name: "Mixpanel",
      },
      {
        href: "/guide/bigquery",
        name: "BigQuery",
      },
      {
        href: "/guide/rudderstack",
        name: "Rudderstack",
      },
      {
        href: "/guide/rudderstack-and-nextjs-with-growthbook",
        name: "Rudderstack + Next.js",
      },
    ],
  },
  {
    href: "/lib",
    name: "SDKs",
    links: [
      {
        href: "/lib/js",
        name: "Javascript",
      },
      {
        href: "/lib/react",
        name: "React",
      },
      {
        href: "/lib/php",
        name: "PHP",
      },
      {
        href: "/lib/ruby",
        name: "Ruby",
      },
      {
        href: "/lib/python",
        name: "Python",
      },
      {
        href: "/lib/go",
        name: "Go",
      },
      {
        href: "/lib/kotlin",
        name: "Kotlin (Android)",
      },
      {
        href: "/lib/flutter",
        name: "Flutter",
      },
      {
        href: "/lib/build-your-own",
        name: "Build Your Own",
      },
    ],
  },
  {
    // /api is a reserved path
    href: "/apidocs",
    name: "API",
    links: [
      {
        href: "/apidocs/authentication",
        name: "Authentication",
      },
      {
        href: "/apidocs/health-check",
        name: "Health Check",
      },
      {
        href: "/apidocs/features",
        name: "Features",
        links: [
          {
            href: "/apidocs/features/definitions",
            name: "Definitions",
          },
          {
            href: "/apidocs/features/create",
            name: "Create",
          },
          {
            href: "/apidocs/features/update",
            name: "Update",
          },
          {
            href: "/apidocs/features/delete",
            name: "Delete",
          },
        ],
      },
    ],
  },
  {
    href: "/types",
    name: "Types",
    links: [
      {
        href: "/types/feature-rule",
        name: "FeatureRule",
      },
    ],
  },
  {
    href: "/faq",
    name: "FAQ",
  },
  {
    href: "/statistics",
    name: "Statistics",
  },
];

const linksInOrder: { name: string; href: string }[] = [];
navLinks.forEach((l) => {
  linksInOrder.push({ name: l.name, href: l.href });
  if (l.links) {
    l.links.forEach((l2) => {
      linksInOrder.push(l2);
      if (l2.links) {
        l2.links.forEach((l3) => {
          linksInOrder.push(l3);
        });
      }
    });
  }
});

function App({ Component, pageProps, router }: AppProps): React.ReactElement {
  const [dark, setDark] = React.useState<null | boolean>(null);
  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);
  useEffect(() => {
    if (dark === null) return;
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    try {
      localStorage.theme = dark ? "dark" : "light";
    } catch (e) {
      // ignore local storage errors
    }
  }, [dark]);

  // Scroll to top of content div when the route changes
  useEffect(() => {
    const handleRouteChange = () => {
      document.querySelector("main").scrollTop = 0;
    };
    router.events.on("routeChangeComplete", handleRouteChange);
    return () => {
      router.events.off("routeChangeComplete", handleRouteChange);
    };
  }, []);

  let currentIndex = -1;
  linksInOrder.forEach((l, i) => {
    if (l.href === router.pathname) {
      currentIndex = i;
    }
  });

  return (
    <div className="h-screen dark:bg-gray-800">
      <Head>
        <title>GrowthBook Docs</title>
        <meta name="robots" content="index, follow" />
        <link
          rel="preload"
          href="https://cdn.jsdelivr.net/npm/prism-themes@1.7.0/themes/prism-dracula.css"
          as="style"
        />
        <link
          rel="stylesheet"
          type="text/css"
          href="https://cdn.jsdelivr.net/npm/prism-themes@1.7.0/themes/prism-dracula.css"
        />
        <style>{`
        body {
          -webkit-font-smoothing: antialiased;
          font-size: 14px;
        }
        pre[class*="language-"] {
          margin-bottom: 1rem;
        }
        img {
          max-width: 100%;
        }
        html {
          color-scheme: light;
        }
        html.dark {
          color-scheme: dark;
        }
        `}</style>
        <script
          dangerouslySetInnerHTML={{
            __html: `
            try {
              if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                document.documentElement.classList.add('dark')
              } else {
                document.documentElement.classList.remove('dark')
              }
            }
            catch(e) {}
            `,
          }}
        />
        {process.env.NEXT_PUBLIC_SCRIPT_HEAD && (
          <script
            dangerouslySetInnerHTML={{
              __html: process.env.NEXT_PUBLIC_SCRIPT_HEAD,
            }}
          />
        )}
      </Head>
      <div className="flex h-full w-full">
        <div className="max-w-0 md:max-w-lg p-0 overflow-x-hidden h-full md:p-5 overflow-y-auto border-r border-gray-100 text-gray-800 dark:border-gray-700 dark:text-gray-200">
          <div className="">
            <Link href="/">
              <a>
                <img src="/growth-book-logo.png" className="w-48 mb-6" />
              </a>
            </Link>
            {navLinks.map((link, i) => (
              <div key={`link${i}`}>
                <DocsLink
                  href={link.href}
                  name={link.name}
                  beta={false}
                  active={router.pathname === link.href}
                />
                {link.links &&
                  link.links.map((sublink, j) => (
                    <div className="ml-3" key={`sublink${j}`}>
                      <DocsLink
                        href={sublink.href}
                        name={sublink.name}
                        beta={sublink.beta}
                        active={router.pathname === sublink.href}
                      />
                      {sublink.links &&
                        sublink.links.map((subsublink, k) => (
                          <div className="ml-3" key={`subsublink${k}`}>
                            <DocsLink
                              href={subsublink.href}
                              name={subsublink.name}
                              beta={subsublink.beta}
                              active={router.pathname === subsublink.href}
                            />
                          </div>
                        ))}
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col h-screen grow w-full content-right justify-center ">
          <nav className="sticky top-0 z-10 px-3 md:px-5 py-4 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
            <div className="flex max-w-3xl justify-end">
              <div className="hidden md:block text-md text-gray-600 dark:text-gray-400">
                <a
                  href="https://www.growthbook.io"
                  className="mr-6 cursor-pointer"
                >
                  Home
                </a>
                <a
                  href="https://app.growthbook.io"
                  className="mr-6 cursor-pointer"
                >
                  Log in/sign up
                </a>
                <a
                  href="https://github.com/growthbook/growthbook"
                  className="mr-6 cursor-pointer"
                >
                  <FaGithub className="inline" /> GitHub
                </a>
                <a
                  href="https://slack.growthbook.io?ref=docs"
                  className="mr-6 cursor-pointer"
                >
                  <FaSlack className="inline" /> Join our slack
                </a>
              </div>
              <div className="flex md:hidden items-center text-sm">
                <Link href="/">
                  <a className="block">
                    <img src="/growth-book-logo.png" className="w-32 mr-3" />
                  </a>
                </Link>

                <select
                  className="bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-100 p-1 mx-1 rounded"
                  placeholder="Jump to Section"
                  value={router.pathname}
                  onChange={(e) => {
                    router.push(e.target.value);
                  }}
                >
                  {navLinks.map((link) => (
                    <React.Fragment key={link.href}>
                      <option value={link.href}>{link.name}</option>
                      {link.links &&
                        link.links.map((sublink) => (
                          <option value={sublink.href} key={sublink.href}>
                            {sublink.name}
                          </option>
                        ))}
                    </React.Fragment>
                  ))}
                </select>
              </div>

              <button
                className="text-gray-100 text-md bg-gray-800 w-6 h-6 text-center hover:bg-gray-700 dark:bg-gray-200 dark:text-gray-800 dark:hover:bg-gray-300 rounded-full"
                onClick={(e) => {
                  e.preventDefault();
                  setDark(!dark);
                }}
                title={dark ? "Switch to light mode" : "Switch to dark mode"}
              >
                {dark ? (
                  <FaSun className="mx-auto" />
                ) : (
                  <FaMoon className="mx-auto" />
                )}
              </button>
            </div>
          </nav>
          <main className="p-5 grow overflow-y-auto w-full">
            {!currentIndex && (
              <div className="md:hidden border-b border-gray-100 dark:border-gray-700 mb-4 pb-4 text-gray-600 dark:text-gray-400">
                <a
                  href="https://www.growthbook.io"
                  className="mr-6 cursor-pointer"
                >
                  Home
                </a>
                <a
                  href="https://app.growthbook.io"
                  className="mr-6 cursor-pointer"
                >
                  Log in/sign up
                </a>
                <a
                  href="https://github.com/growthbook/growthbook"
                  className="mr-6 cursor-pointer"
                >
                  <FaGithub className="inline" /> GitHub
                </a>
                <a
                  href="https://slack.growthbook.io?ref=docs"
                  className="mr-6 cursor-pointer"
                >
                  <FaSlack className="inline" /> Join our slack
                </a>
              </div>
            )}
            <div className="prose prose-purple  dark:prose-dark max-w-3xl w-full">
              <div className="float-right ml-4 mb-4 hidden lg:block">
                <a
                  className="text-sm opacity-80 hover:opacity-100"
                  href={`https://github.com/growthbook/growthbook/edit/main/packages/docs/pages${
                    router.pathname
                  }${
                    ["/lib", "/app"].includes(router.pathname) ? "/index" : ""
                  }${router.pathname === "/" ? "index" : ""}.mdx`}
                >
                  Edit this page on GitHub
                </a>
              </div>

              <Component {...pageProps} />

              {currentIndex >= 0 && (
                <div className="p-5 border-t border-gray-100 dark:border-gray-700">
                  <footer className="dark:text-gray-200 max-w-3xl">
                    <div className="flex">
                      {currentIndex > 0 && (
                        <div className="flex">
                          <Link href={linksInOrder[currentIndex - 1].href}>
                            <a className="flex items-center">
                              <FaChevronLeft /> Previous
                            </a>
                          </Link>
                          <span className="hidden md:inline opacity-60 ml-2">
                            ({linksInOrder[currentIndex - 1].name})
                          </span>
                        </div>
                      )}
                      <div className="grow"></div>
                      {currentIndex < linksInOrder.length - 1 && (
                        <div className="flex">
                          <span className="hidden md:inline opacity-60 mr-2">
                            ({linksInOrder[currentIndex + 1].name})
                          </span>
                          <Link href={linksInOrder[currentIndex + 1].href}>
                            <a className="flex items-center">
                              Next <FaChevronRight />
                            </a>
                          </Link>
                        </div>
                      )}
                    </div>
                  </footer>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;
