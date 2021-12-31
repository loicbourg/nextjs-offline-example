import Link from 'next/link'

export default function Page(props) {
  return <>
    <h1>Hello there {props.name}</h1>
    <Link href="/" >
      <a>
        Retour sur l&apos;index
      </a>
    </Link>
  </>
}

export async function getServerSideProps(context) {
  return {
    props: {
      name: 'John'
    }
  }
}