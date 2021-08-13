import { expect } from "chai";
import "@nomiclabs/hardhat-ethers";
import { artifacts, ethers, waffle } from "hardhat";
import { Artifact } from "hardhat/types";
import { RitzIco } from "../typechain/RitzIco";
const { deployContract } = waffle;
import { Signers } from "../types";
import { Contract, BigNumber } from "ethers";
import { increaseTime } from "./Utilities";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import _ from "underscore";
import { Ritz__factory } from "../typechain/factories/Ritz__factory";

describe("RitzIco", function () {
  let icoContract: Contract;

  before(async function () {
    this.signers = {} as Signers;

    const signers: SignerWithAddress[] = await ethers.getSigners();
    this.signers.admin = signers[0];
    this.signers.user_1 = signers[1];
    this.signers.user_2 = signers[2];
    this.signers.user_3 = signers[3];
    this.signers.user_4 = signers[4];
    this.signers.wallet = signers[5];
    this.signers.investor1 = signers[6];
    this.signers.investor2 = signers[7];
    this.signers.investor3 = signers[8];
    this.signers.investor4 = signers[9];
    this.signers.investor5 = signers[10];
    this.signers.founder1 = signers[11];
    this.signers.founder2 = signers[12];
    this.signers.founder3 = signers[13];
    this.signers.founder4 = signers[14];
    this.signers.founder5 = signers[15];
    const icoArtifact: Artifact = await artifacts.readArtifact("RitzIco");
    icoContract = <RitzIco>(
      await deployContract(this.signers.admin, icoArtifact, [await this.signers.wallet.getAddress()])
    );
  });

  it("Verify PreIco starting time", async function () {
    expect(await icoContract.callStatic.preIcoStartTime()).to.equal(BigNumber.from(1628726400));
  });
  it("Verify PreIco ending time", async function () {
    expect(await icoContract.callStatic.preIcoEndTime()).to.equal(BigNumber.from(1628812799));
  });
  it("Verify Ico starting time", async function () {
    expect(await icoContract.callStatic.icoStartTime()).to.equal(BigNumber.from(1631923200));
  });
  it("Verify PreIco ending time", async function () {
    expect(await icoContract.callStatic.icoEndTime()).to.equal(BigNumber.from(1632009599));
  });
  it("Verify default stage in preIco", async function () {
    expect(await icoContract.callStatic.stage()).to.equal(BigNumber.from(0));
  });
  it("Verify that HardCap is 10000 Ether", async function () {
    expect(await icoContract.callStatic.MaximumGoal()).to.equal(ethers.utils.parseEther("10000"));
  });
  it("Verify that SoftCap is 5000 Ether", async function () {
    expect(await icoContract.callStatic.MinimumGoal()).to.equal(ethers.utils.parseEther("5000"));
  });
  it("Verify totalTokens for sale are 40% of 1 billion", async function () {
    expect(await icoContract.callStatic.totalTokensForSale()).to.equal(ethers.utils.parseEther("400000000000"));
  });
  it("Verify that 10% (100000000000 Ritz) tokens are allocated for early token invertors", async function () {
    expect(await icoContract.callStatic.earlyInvestorBonus()).to.equal(ethers.utils.parseEther("100000000000"));
  });
  it("Verify that 15% (150000000000 Ritz )tokens will be reserved for investors", async function () {
    expect(await icoContract.callStatic.investorsAllocation()).to.equal(ethers.utils.parseEther("150000000000"));
  });
  it("Verify that 35% (350000000000 Ritz )tokens will be reserved for founders", async function () {
    expect(await icoContract.callStatic.foundersAllocation()).to.equal(ethers.utils.parseEther("350000000000"));
  });
  it("Verify that maximum deposit amount is 5000 ether", async function () {
    expect(await icoContract.callStatic.maxEtherAmount()).to.equal(ethers.utils.parseEther("5000"));
  });
  it("Verify that minimum deposit amount is 0.05 ether", async function () {
    expect(await icoContract.callStatic.minEtherAmount()).to.equal(ethers.utils.parseEther("0.05"));
  });
  it("Verify that rate is 2000 Ritz per Eth", async function () {
    expect(await icoContract.callStatic.rate()).to.equal(ethers.utils.parseEther("2000"));
  });
  it("Verify that rate is 2000 Ritz per Eth", async function () {
    expect(await icoContract.callStatic.rate()).to.equal(ethers.utils.parseEther("2000"));
  });
  it("Throw, If preIco is not started yet", async function () {
    await expect(
      icoContract
        .connect(this.signers.admin)
        .buyTokens(await this.signers.user_1.getAddress(), { value: ethers.utils.parseEther("1") }),
    ).to.be.revertedWith("Crowdsale: PRE_ICO_NOT_STARTED");
  });
  it("Throw, If deposit amount is less than 0.05 ether", async function () {
    const now = await (await ethers.provider.getBlock("latest")).timestamp;
    const preIcoStartTime = await icoContract.callStatic.preIcoStartTime();
    await increaseTime(preIcoStartTime - now + 10);
    await expect(
      icoContract
        .connect(this.signers.admin)
        .buyTokens(await this.signers.user_1.getAddress(), { value: ethers.utils.parseEther("0.04") }),
    ).to.be.revertedWith("Crowdsale: Minimum deposit is 0.05");
  });
  it("Throw, If deposit amount is greater than 5000 ether", async function () {
    const now = await (await ethers.provider.getBlock("latest")).timestamp;

    const preIcoStartTime = await icoContract.callStatic.preIcoStartTime();
    await increaseTime(preIcoStartTime - now + 10);
    await expect(
      icoContract
        .connect(this.signers.admin)
        .buyTokens(await this.signers.user_1.getAddress(), { value: ethers.utils.parseEther("5001") }),
    ).to.be.revertedWith("Crowdsale: Maximum deposit is 5000");
  });
  it("Successfully bought tokens in preIco with 20% bonus", async function () {
    const tokenAddress = await icoContract.callStatic.token();
    const token = Ritz__factory.connect(tokenAddress, this.signers.admin);

    await expect(async () =>
      icoContract
        .connect(this.signers.admin)
        .buyTokens(await this.signers.user_1.getAddress(), { value: ethers.utils.parseEther("1") }),
    ).to.be.changeEtherBalance(this.signers.wallet, ethers.utils.parseEther("1"));

    await expect(async () =>
      icoContract
        .connect(this.signers.admin)
        .buyTokens(await this.signers.user_1.getAddress(), { value: ethers.utils.parseEther("1") }),
    ).to.be.changeTokenBalance(token, this.signers.user_1, ethers.utils.parseEther("2400"));

    await expect(await icoContract.callStatic.totalWeiRaisedDuringPreICO()).to.be.equal(ethers.utils.parseEther("2"));
  });
  it("Throw, if crowdsale limit reached", async function () {
    await expect(
      icoContract
        .connect(this.signers.admin)
        .buyTokens(await this.signers.user_1.getAddress(), { value: ethers.utils.parseEther("200000001") }),
    ).to.be.revertedWith("CROWDSALE_LIMIT_REACHED");
  });
  it("Throw, If preIco is finished", async function () {
    const now = await (await ethers.provider.getBlock("latest")).timestamp;
    const preIcoEndTime = await icoContract.callStatic.preIcoEndTime();
    await increaseTime(preIcoEndTime - now + 10);
    await expect(
      icoContract
        .connect(this.signers.admin)
        .buyTokens(await this.signers.user_1.getAddress(), { value: ethers.utils.parseEther("1") }),
    ).to.be.revertedWith("Crowdsale: PRE_ICO_ENDED");
  });
  it("Set ICO stage", async function () {
    await icoContract.connect(this.signers.admin).setCrowdsaleStage(BigNumber.from(1));
    await expect(BigNumber.from(1)).to.be.equal(await icoContract.callStatic.stage());
  });
  it("Check either ico ended or not", async function () {
    expect(await icoContract.callStatic.hasEnded()).to.be.equal(false);
  });
  it("Crowdsale is not finalized", async function () {
    expect(await icoContract.callStatic.isFinalized()).to.be.equal(false);
  });
  it("Throw, If Ico is not started yet", async function () {
    await expect(
      icoContract
        .connect(this.signers.admin)
        .buyTokens(await this.signers.user_1.getAddress(), { value: ethers.utils.parseEther("1") }),
    ).to.be.revertedWith("Crowdsale: ICO_NOT_STARTED");
  });
  it("Throw, if crowdsale is not yet finalized by owner", async function () {
    await expect(icoContract.connect(this.signers.user_1).finish()).to.be.revertedWith(
      "Ownable: caller is not the owner",
    );
  });
  it("Throw, if crowdsale is not yet finalized and owner try to finish it", async function () {
    await expect(icoContract.connect(this.signers.admin).finish()).to.be.revertedWith("NOT_ENDED");
  });
  it("Throw, if allocation of tokens to the investors is greater than 15% of total supply", async function () {
    await expect(
      icoContract
        .connect(this.signers.admin)
        .addInvestorAllocation(
          [
            await this.signers.investor1.getAddress(),
            await this.signers.investor2.getAddress(),
            await this.signers.investor3.getAddress(),
            await this.signers.investor4.getAddress(),
            await this.signers.investor5.getAddress(),
          ],
          [
            ethers.utils.parseEther("30000000000"),
            ethers.utils.parseEther("30000000000"),
            ethers.utils.parseEther("30000000000"),
            ethers.utils.parseEther("30000000000"),
            ethers.utils.parseEther("30000000010"),
          ],
        ),
    ).to.be.revertedWith("INVESTOR_ALLOCATION_LIMIT_REACHED");
  });
  it("allocation of tokens to the investors (15% of total supply)", async function () {
    await icoContract
      .connect(this.signers.admin)
      .addInvestorAllocation(
        [
          await this.signers.investor1.getAddress(),
          await this.signers.investor2.getAddress(),
          await this.signers.investor3.getAddress(),
          await this.signers.investor4.getAddress(),
          await this.signers.investor5.getAddress(),
        ],
        [
          ethers.utils.parseEther("30000000000"),
          ethers.utils.parseEther("30000000000"),
          ethers.utils.parseEther("30000000000"),
          ethers.utils.parseEther("30000000000"),
          ethers.utils.parseEther("29999999999"),
        ],
      );

    await expect(
      await icoContract.callStatic.investorsAllocated(await this.signers.investor1.getAddress()),
    ).to.be.equal(ethers.utils.parseEther("30000000000"));
    await expect(
      await icoContract.callStatic.investorsAllocated(await this.signers.investor2.getAddress()),
    ).to.be.equal(ethers.utils.parseEther("30000000000"));
    await expect(
      await icoContract.callStatic.investorsAllocated(await this.signers.investor3.getAddress()),
    ).to.be.equal(ethers.utils.parseEther("30000000000"));
    await expect(
      await icoContract.callStatic.investorsAllocated(await this.signers.investor4.getAddress()),
    ).to.be.equal(ethers.utils.parseEther("30000000000"));
    await expect(
      await icoContract.callStatic.investorsAllocated(await this.signers.investor5.getAddress()),
    ).to.be.equal(ethers.utils.parseEther("29999999999"));
  });
  it("Process investors allocated tokens", async function () {
    await expect(icoContract.connect(this.signers.admin).distributeToPrivateInvestors(5)).to.be.revertedWith(
      "NOT_ENDED",
    );
    const now = await (await ethers.provider.getBlock("latest")).timestamp;
    const icoEndTime = await icoContract.callStatic.icoEndTime();
    await increaseTime(icoEndTime - now + 10);
    const tokenAddress = await icoContract.callStatic.token();
    const token = Ritz__factory.connect(tokenAddress, this.signers.admin);
    await expect(async () =>
      icoContract.connect(this.signers.admin).distributeToPrivateInvestors(5),
    ).to.be.changeTokenBalances(
      token,
      [
        this.signers.investor1,
        this.signers.investor2,
        this.signers.investor3,
        this.signers.investor4,
        this.signers.investor5,
      ],
      [
        ethers.utils.parseEther("30000000000"),
        ethers.utils.parseEther("30000000000"),
        ethers.utils.parseEther("30000000000"),
        ethers.utils.parseEther("30000000000"),
        ethers.utils.parseEther("29999999999"),
      ],
    );
  });
  it("Throw, if allocation of tokens to the founders is greater than 35% of total supply", async function () {
    await expect(
      icoContract
        .connect(this.signers.admin)
        .addTeamAllocation(
          [
            await this.signers.founder1.getAddress(),
            await this.signers.founder2.getAddress(),
            await this.signers.founder3.getAddress(),
            await this.signers.founder4.getAddress(),
            await this.signers.founder5.getAddress(),
          ],
          [
            ethers.utils.parseEther("70000000000"),
            ethers.utils.parseEther("70000000000"),
            ethers.utils.parseEther("70000000000"),
            ethers.utils.parseEther("70000000000"),
            ethers.utils.parseEther("70000000000"),
          ],
        ),
    ).to.be.revertedWith("FOUNDERS_ALLOCATION_LIMIT_REACHED");
  });
  it("allocation of tokens to the founders (35% of total supply)", async function () {
    await icoContract
      .connect(this.signers.admin)
      .addTeamAllocation(
        [
          await this.signers.founder1.getAddress(),
          await this.signers.founder2.getAddress(),
          await this.signers.founder3.getAddress(),
          await this.signers.founder4.getAddress(),
          await this.signers.founder5.getAddress(),
        ],
        [
          ethers.utils.parseEther("70000000000"),
          ethers.utils.parseEther("70000000000"),
          ethers.utils.parseEther("70000000000"),
          ethers.utils.parseEther("70000000000"),
          ethers.utils.parseEther("69999999999"),
        ],
      );

    await expect(
      await icoContract.callStatic.foundersAllocated(await this.signers.founder1.getAddress()),
    ).to.be.equal(ethers.utils.parseEther("70000000000"));
    await expect(
      await icoContract.callStatic.foundersAllocated(await this.signers.founder2.getAddress()),
    ).to.be.equal(ethers.utils.parseEther("70000000000"));
    await expect(
      await icoContract.callStatic.foundersAllocated(await this.signers.founder3.getAddress()),
    ).to.be.equal(ethers.utils.parseEther("70000000000"));
    await expect(
      await icoContract.callStatic.foundersAllocated(await this.signers.founder4.getAddress()),
    ).to.be.equal(ethers.utils.parseEther("70000000000"));
    await expect(
      await icoContract.callStatic.foundersAllocated(await this.signers.founder5.getAddress()),
    ).to.be.equal(ethers.utils.parseEther("69999999999"));
  });
  it("Process founders allocated tokens", async function () {
    const tokenAddress = await icoContract.callStatic.token();
    const token = Ritz__factory.connect(tokenAddress, this.signers.admin);
    await expect(async () =>
      icoContract.connect(this.signers.admin).distributeToTeam(5),
    ).to.be.changeTokenBalances(
      token,
      [
        this.signers.founder1,
        this.signers.founder2,
        this.signers.founder3,
        this.signers.founder4,
        this.signers.founder5,
      ],
      [
        ethers.utils.parseEther("70000000000"),
        ethers.utils.parseEther("70000000000"),
        ethers.utils.parseEther("70000000000"),
        ethers.utils.parseEther("70000000000"),
        ethers.utils.parseEther("69999999999"),
      ],
    );
  });
  it("Finalize ico successfully", async function () {
    await icoContract.connect(this.signers.admin).finish()
    // await expect(icoContract.connect(this.signers.admin).finish()).to.be.not.reverted;
  });
});
