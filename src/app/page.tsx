import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function HomePage() {
  return (
    <main className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-6">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <CardTitle className="text-3xl">DNDQuestAI</CardTitle>
          <CardDescription className="text-base">
            A solo AI-powered D&D 5e adventure.
            <br />
            Claude is your Dungeon Master.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Create a character, choose your path, and let the AI weave your
            story. Every decision matters.
          </p>
          <Link href="/character">
            <Button size="lg" className="w-full">
              New Adventure
            </Button>
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
