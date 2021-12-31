import Link from "next/link";

export default function Offline() {
  return <><h1>
    Vous êtes hors ligne !
  </h1>

    <p>
      Pour vous consoler voilà un cookie =&gt; 🍪
    </p>

    <Link href="/" >
      <a>
        Retour sur l&apos;index
      </a>
    </Link>
  </>
}