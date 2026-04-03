class ExcalidrawCli < Formula
  desc "Create Excalidraw flowcharts from DSL, JSON, or DOT"
  homepage "https://github.com/swiftlysingh/excalidraw-cli"
  url "https://registry.npmjs.org/@swiftlysingh/excalidraw-cli/-/excalidraw-cli-1.2.0.tgz"
  sha256 "ed06123ee9c57db5bb270a6b87fcc07c061093c6a94590a6974591067dd9afc0"
  license "MIT"

  depends_on "node"

  def install
    system "npm", "install", *std_npm_args

    bin.install_symlink libexec.glob("bin/*")

    man1.install libexec/"lib/node_modules/@swiftlysingh/excalidraw-cli/man/excalidraw-cli.1"
  end

  test do
    (testpath/"flow.dsl").write "(Start) -> [Ship Brew Support] -> (Done)"

    system bin/"excalidraw-cli", "create", "flow.dsl", "-o", "flow.excalidraw"

    assert_path_exists testpath/"flow.excalidraw"
    assert_match "\"type\":\"excalidraw\"", (testpath/"flow.excalidraw").read
  end
end
